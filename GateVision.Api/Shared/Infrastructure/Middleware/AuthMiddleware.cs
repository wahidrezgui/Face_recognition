using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using GateVision.Api.Features.GateOperations.Infrastructure;
using Microsoft.IdentityModel.Tokens;

namespace GateVision.Api.Shared.Infrastructure.Middleware;

public class AuthMiddleware
{
    private readonly RequestDelegate _next;
    private readonly string _apiKey;
    private readonly GateService _gateService;
    private readonly TokenValidationParameters _jwtValidationParams;
    private static readonly JwtSecurityTokenHandler JwtHandler = new();

    private static readonly HashSet<string> PublicPaths = new(StringComparer.OrdinalIgnoreCase)
    {
        "/api/v1/health",
        "/api/v1/auth/token",
    };

    private readonly ILogger<AuthMiddleware> _logger;

    public AuthMiddleware(RequestDelegate next, IConfiguration configuration, ILogger<AuthMiddleware> logger, GateService gateService)
    {
        _next = next;
        _logger = logger;
        _gateService = gateService;
        _apiKey = configuration["Auth:ApiKey"]
            ?? throw new InvalidOperationException("Auth:ApiKey not configured.");
        var jwtSecret = configuration["Auth:JwtSecret"]
            ?? throw new InvalidOperationException("Auth:JwtSecret not configured.");
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

        if (ctx.Request.Method == "GET"
            && (path.Contains("/kiosk-settings", StringComparison.OrdinalIgnoreCase)
                || path.Contains("/desk-settings", StringComparison.OrdinalIgnoreCase)))
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
                await _next(ctx);
                return;
            }

            var gates = await _gateService.GetAllAsync(ctx.RequestAborted);
            foreach (var gate in gates)
            {
                if (!string.IsNullOrEmpty(gate.ApiKey) && providedKey == gate.ApiKey)
                {
                    ctx.User = new ClaimsPrincipal(new ClaimsIdentity(
                        [new Claim(ClaimTypes.Role, "api"), new Claim("GateId", gate.Id.ToString())], "GateApiKey"));
                    await _next(ctx);
                    return;
                }
            }

            var principal = ValidateJwtToken(providedKey);
            if (principal is not null)
            {
                ctx.User = principal;
                await _next(ctx);
                return;
            }
        }

        _logger.LogWarning("401: No valid auth for {Method} {Path}", ctx.Request.Method, path);
        ctx.Response.StatusCode = 401;
        await ctx.Response.WriteAsJsonAsync(new
        {
            type = "https://tools.ietf.org/html/rfc7807",
            title = "Unauthorized",
            status = 401,
            detail = "unauthorized",
        });
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
