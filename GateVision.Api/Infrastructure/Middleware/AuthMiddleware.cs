using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace GateVision.Api.Infrastructure.Middleware;

public class AuthMiddleware
{
    private readonly RequestDelegate _next;
    private readonly string _apiKey;
    private readonly Dictionary<string, string> _gateApiKeys;
    private readonly TokenValidationParameters _jwtValidationParams;
    private static readonly JwtSecurityTokenHandler JwtHandler = new();

    private static readonly HashSet<string> PublicPaths = new(StringComparer.OrdinalIgnoreCase)
    {
        "/api/health",
        "/api/auth/login",
    };

    private readonly ILogger<AuthMiddleware> _logger;

    public AuthMiddleware(RequestDelegate next, IConfiguration configuration, ILogger<AuthMiddleware> logger)
    {
        _next = next;
        _logger = logger;
        _apiKey = configuration["Auth:ApiKey"]
            ?? throw new InvalidOperationException("Auth:ApiKey not configured. Set via User Secrets, appsettings, or environment variable.");
        _gateApiKeys = configuration.GetSection("Auth:GateApiKeys")
            .Get<Dictionary<string, string>>() ?? new Dictionary<string, string>();
        var jwtSecret = configuration["Auth:JwtSecret"]
            ?? throw new InvalidOperationException("Auth:JwtSecret not configured. Set via User Secrets, appsettings, or environment variable.");
        _jwtValidationParams = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = "GateVision",
            ValidAudience = "GateVision",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        };
    }

    public async Task InvokeAsync(HttpContext ctx)
    {
        var path = ctx.Request.Path.Value ?? "";

        if (PublicPaths.Contains(path))
        {
            await _next(ctx);
            return;
        }

        if (path.Contains("/profile-image", StringComparison.OrdinalIgnoreCase)
            || path.Contains("/face-image/", StringComparison.OrdinalIgnoreCase))
        {
            await _next(ctx);
            return;
        }

        if (ctx.User.Identity?.IsAuthenticated == true)
        {
            await _next(ctx);
            return;
        }

        var providedKey = ctx.Request.Headers["X-API-Key"].FirstOrDefault()
                       ?? ctx.Request.Query["api_key"].FirstOrDefault()
                       ?? ctx.Request.Query["token"].FirstOrDefault();

        if (!string.IsNullOrEmpty(providedKey))
        {
            if (providedKey == _apiKey)
            {
                ctx.User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.Role, "api")], "ApiKey"));
                _logger.LogDebug("Authenticated via global API key for {Path}", path);
                await _next(ctx);
                return;
            }

            // Check per-gate API keys
            foreach (var (gateId, gateKey) in _gateApiKeys)
            {
                if (providedKey == gateKey)
                {
                    ctx.User = new ClaimsPrincipal(new ClaimsIdentity(
                        [new Claim(ClaimTypes.Role, "api"), new Claim("GateId", gateId)], "GateApiKey"));
                    _logger.LogDebug("Authenticated via gate API key for {GateId} on {Path}", gateId, path);
                    await _next(ctx);
                    return;
                }
            }

            var principal = ValidateJwtToken(providedKey);
            if (principal is not null)
            {
                ctx.User = principal;
                _logger.LogDebug("Authenticated via JWT from request for {Path}", path);
                await _next(ctx);
                return;
            }
        }

        _logger.LogWarning("401: No valid auth credentials for {Method} {Path} (hasKey={HasKey} hasToken={HasToken})",
            ctx.Request.Method, path,
            !string.IsNullOrEmpty(ctx.Request.Headers["X-API-Key"].FirstOrDefault()),
            !string.IsNullOrEmpty(ctx.Request.Query["token"].FirstOrDefault()));
        ctx.Response.StatusCode = 401;
        await ctx.Response.WriteAsync("{\"error\":\"unauthorized\"}");
    }

    ClaimsPrincipal? ValidateJwtToken(string token)
    {
        try
        {
            return JwtHandler.ValidateToken(token, _jwtValidationParams, out _);
        }
        catch
        {
            return null;
        }
    }
}
