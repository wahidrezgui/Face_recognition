using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using GateVision.Api.Shared.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace GateVision.Api.Features.Platform.Api;

public static class PlatformEndpoints
{
    public static void MapPlatformEndpoints(this WebApplication app, string jwtSecret, string apiKey)
    {
        app.MapPost("/api/v1/auth/token", (LoginDto dto, HttpRequest request, ILogger<Program> logger) =>
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

        app.MapGet("/api/v1/health", async (AppDbContext db) =>
        {
            var dbOk = false;
            try { dbOk = await db.Database.CanConnectAsync(); }
            catch { /* ignored */ }
            return Results.Ok(new { status = "ok", db = dbOk });
        });
    }
}

public record LoginDto(string ApiKey);
