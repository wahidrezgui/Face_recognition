using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using DbUp;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using GateVision.Api.Endpoints;
using GateVision.Api.Infrastructure.Db;
using GateVision.Api.Infrastructure.Redis;
using GateVision.Api.Services;
using StackExchange.Redis;
var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrEmpty(connectionString))
    throw new InvalidOperationException("Connection string 'DefaultConnection' not found. Set via appsettings.json, User Secrets, or environment variable.");

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(connectionString, npgsql =>
    {
        npgsql.EnableRetryOnFailure(3);
        npgsql.UseVector();
    });
});

var redisConnection = builder.Configuration.GetConnectionString("Redis");
IConnectionMultiplexer? redis = null;
if (!string.IsNullOrEmpty(redisConnection))
{
    try
    {
        redis = ConnectionMultiplexer.Connect(redisConnection);
        builder.Services.AddSingleton(redis);
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine($"[Redis] Connection failed: {ex.Message} — proceeding without cache");
    }
}

builder.Services.AddSingleton(new CacheService(redis));
builder.Services.AddScoped<IdentificationService>();
builder.Services.AddScoped<EnrollmentService>();

var jwtSecret = builder.Configuration["Auth:JwtSecret"] ?? "dev-secret-key-32-chars-min!!!!!";
var apiKey = builder.Configuration["Auth:ApiKey"] ?? "dev-api-key-change-me";

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
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddProblemDetails();
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("IdentifyPolicy", cfg =>
    {
        cfg.PermitLimit = 10;
        cfg.Window = TimeSpan.FromSeconds(1);
        cfg.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        cfg.QueueLimit = 0;
    });
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
    app.UseDeveloperExceptionPage();
else
    app.UseExceptionHandler();

var upgrader = DeployChanges.To
    .PostgresqlDatabase(connectionString)
    .WithScriptsEmbeddedInAssembly(typeof(Program).Assembly)
    .LogTo(new DbUpLogger(app.Logger))
    .Build();

var result = upgrader.PerformUpgrade();
if (!result.Successful)
{
    app.Logger.LogError(result.Error, "Database migration failed");
    throw result.Error;
}
app.Logger.LogInformation("Database migration completed");

app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.Use(async (ctx, next) =>
{
    if (ctx.Request.Path.StartsWithSegments("/api/health") || ctx.Request.Path.StartsWithSegments("/api/auth/login"))
    {
        await next();
        return;
    }
    if (ctx.User.Identity?.IsAuthenticated == true)
    {
        await next();
        return;
    }
    var providedKey = ctx.Request.Headers["X-API-Key"].FirstOrDefault();
    if (string.IsNullOrEmpty(providedKey))
        providedKey = ctx.Request.Query["token"].FirstOrDefault();
    if (!string.IsNullOrEmpty(providedKey) && providedKey == apiKey)
    {
        ctx.User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.Role, "api")], "ApiKey"));
        await next();
        return;
    }
    ctx.Response.StatusCode = 401;
    await ctx.Response.WriteAsync("{\"error\":\"unauthorized\"}");
});

app.MapIdentifyEndpoints();
app.MapPersonEndpoints();
app.MapEventEndpoints();
app.MapImageEndpoints();

app.MapPost("/api/auth/login", (LoginDto dto, HttpRequest request, ILogger<Program> logger) =>
{
    logger.LogInformation("Login attempt from {RemoteIp}", request.HttpContext.Connection.RemoteIpAddress);
    if (dto.ApiKey != apiKey)
        return Results.Unauthorized();
    var handler = new JwtSecurityTokenHandler();
    var key = Encoding.UTF8.GetBytes(jwtSecret);
    var token = handler.CreateToken(new SecurityTokenDescriptor
    {
        Subject = new ClaimsIdentity([new Claim(ClaimTypes.Name, "dashboard")]),
        Expires = DateTime.UtcNow.AddHours(8),
        Issuer = "GateVision",
        Audience = "GateVision",
        SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256),
    });
    return Results.Ok(new { token = handler.WriteToken(token) });
});

app.MapGet("/api/health", async (AppDbContext db) =>
{
    var dbOk = false;
    try
    {
        dbOk = await db.Database.CanConnectAsync();
    }
    catch { }
    return Results.Ok(new { status = "ok", db = dbOk });
});

app.Run();

internal class DbUpLogger(ILogger logger) : DbUp.Engine.Output.IUpgradeLog
{
    public void WriteInformation(string format, params object[] args) => logger.LogInformation(format, args);
    public void WriteError(string format, params object[] args) => logger.LogError(format, args);
    public void WriteWarning(string format, params object[] args) => logger.LogWarning(format, args);
}

public record LoginDto(string ApiKey);
