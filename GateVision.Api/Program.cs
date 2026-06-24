using System.Threading.RateLimiting;
using DbUp;
using GateVision.Api.Features.AccessEvents.Api;
using GateVision.Api.Features.AccessEvents.Application;
using GateVision.Api.Features.AccessEvents.Infrastructure;
using GateVision.Api.Features.GateOperations.Api;
using GateVision.Api.Features.GateOperations.Infrastructure;
using GateVision.Api.Features.HrSync.Api;
using GateVision.Api.Features.HrSync.Application;
using GateVision.Api.Features.Identity.Api;
using GateVision.Api.Features.Identity.Application;
using GateVision.Api.Features.Identity.Domain;
using GateVision.Api.Features.Identity.Infrastructure;
using GateVision.Api.Features.Platform.Api;
using GateVision.Api.Shared.Infrastructure;
using GateVision.Api.Shared.Infrastructure.HostedServices;
using GateVision.Api.Shared.Infrastructure.Middleware;
using GateVision.Api.Shared.Infrastructure.Persistence;
using GateVision.Api.Shared.Infrastructure.Redis;
using GateVision.Api.Shared.Kernel;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString, npgsql => npgsql.EnableRetryOnFailure(3)));

IConnectionMultiplexer? redis = null;
var redisConnection = builder.Configuration.GetConnectionString("Redis");
if (!string.IsNullOrEmpty(redisConnection))
{
    try
    {
        redis = ConnectionMultiplexer.Connect(redisConnection);
        builder.Services.AddSingleton(redis);
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine($"[Redis] Connection failed: {ex.Message}");
    }
}

builder.Services.AddSingleton(new CacheService(redis));
builder.Services.AddSingleton<TrainingModeService>();
builder.Services.AddSingleton<LogUnknownService>();
builder.Services.AddSingleton<EventBufferService>();
builder.Services.AddSingleton<GateChannelRegistry>();
builder.Services.AddSingleton<GateService>();
builder.Services.AddSingleton<WelcomeDedupService>();
builder.Services.Configure<QdrantOptions>(builder.Configuration.GetSection(QdrantOptions.SectionName));
builder.Services.AddSingleton<IVectorStore, QdrantVectorStore>();
builder.Services.AddScoped<IPersonRepository, PersonRepository>();
builder.Services.AddScoped<IdentificationService>();
builder.Services.AddScoped<IdentifyPersonHandler>();
builder.Services.AddScoped<EnrollmentService>();
builder.Services.AddScoped<EmployeeSyncService>();
builder.Services.AddHttpClient();
builder.Services.AddHostedService<EventBufferFlushService>();
builder.Services.AddHostedService<GateEventCleanupService>();
builder.Services.AddHostedService<QdrantInitService>();

var jwtSecret = builder.Configuration["Auth:JwtSecret"]
    ?? throw new InvalidOperationException("Auth:JwtSecret not configured.");
var apiKey = builder.Configuration["Auth:ApiKey"]
    ?? throw new InvalidOperationException("Auth:ApiKey not configured.");

builder.Services.AddAuthentication("Bearer")
    .AddJwtBearer("Bearer", options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = "GateVision",
            ValidAudience = "GateVision",
            IssuerSigningKey = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(jwtSecret)),
        };
        options.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var token = ctx.Request.Query["token"].FirstOrDefault();
                if (!string.IsNullOrEmpty(token) &&
                    ctx.Request.Path.StartsWithSegments("/api/v1/events/stream"))
                    ctx.Token = token;
                return Task.CompletedTask;
            }
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddProblemDetails();
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new UtcDateTimeJsonConverter());
    options.SerializerOptions.Converters.Add(new NullableUtcDateTimeJsonConverter());
});
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("IdentifyPolicy", cfg =>
    {
        cfg.PermitLimit = 30;
        cfg.Window = TimeSpan.FromSeconds(1);
        cfg.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        cfg.QueueLimit = 200;
    });
    options.AddFixedWindowLimiter("EnrollPolicy", cfg =>
    {
        cfg.PermitLimit = 5;
        cfg.Window = TimeSpan.FromSeconds(1);
        cfg.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        cfg.QueueLimit = 500;
    });
});

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? ["http://localhost:3000"];
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (builder.Environment.IsDevelopment())
            policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
        else
            policy.WithOrigins(allowedOrigins).AllowAnyMethod().AllowAnyHeader();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
    app.UseDeveloperExceptionPage();
else
    app.UseGateVisionExceptionHandling();

var upgrader = DeployChanges.To
    .PostgresqlDatabase(connectionString)
    .WithScriptsEmbeddedInAssembly(typeof(Program).Assembly, s => !s.Contains("Seed"))
    .LogTo(new DbUpLogger(app.Logger))
    .Build();

var migrated = false;
for (var retry = 0; retry < 10; retry++)
{
    try
    {
        var r = upgrader.PerformUpgrade();
        if (r.Successful) { migrated = true; break; }
        app.Logger.LogWarning("Database migration attempt {Attempt} failed: {Error}", retry + 1, r.Error);
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Database migration attempt {Attempt} threw", retry + 1);
    }
    Thread.Sleep(3000);
}

if (!migrated)
    throw new InvalidOperationException("Database migration failed after 10 retries");

app.Logger.LogInformation("Database migration completed");

app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<AuthMiddleware>();

app.MapPlatformEndpoints(jwtSecret, apiKey);
app.MapIdentifyEndpoints();
app.MapPersonEndpoints();
app.MapEventEndpoints();
app.MapValidatedEventEndpoints();
app.MapGateEndpoints();
app.MapSyncEndpoints();

app.Run();

public partial class Program { }

internal class DbUpLogger(ILogger logger) : DbUp.Engine.Output.IUpgradeLog
{
    public void WriteInformation(string format, params object[] args) => logger.LogInformation(format, args);
    public void WriteError(string format, params object[] args) => logger.LogError(format, args);
    public void WriteWarning(string format, params object[] args) => logger.LogWarning(format, args);
}
