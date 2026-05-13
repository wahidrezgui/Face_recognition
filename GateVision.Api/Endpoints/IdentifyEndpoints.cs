using System.Text.Json.Serialization;
using GateVision.Api.Domain;
using GateVision.Api.Infrastructure.Db;
using GateVision.Api.Services;

namespace GateVision.Api.Endpoints;

public static class IdentifyEndpoints
{
    public static void MapIdentifyEndpoints(this WebApplication app)
    {
        app.MapPost("/api/identify", async (IdentifyRequestDto dto, IdentificationService svc, AppDbContext db, CancellationToken ct) =>
        {
            if (dto.Embedding.Length != 512)
                return Results.BadRequest($"Embedding must have exactly 512 dimensions, got {dto.Embedding.Length}");
            var capturedAt = DateTime.Parse(dto.CapturedAt).ToUniversalTime();
            var result = await svc.Identify(dto.Embedding, dto.FrameQuality, capturedAt);

            var direction = string.Equals(dto.Direction, "exit", StringComparison.OrdinalIgnoreCase)
                ? Direction.Exit
                : Direction.Entry;

            if (result.PersonId.HasValue)
            {
                var gateEvent = new GateEvent
                {
                    Id = Guid.NewGuid(),
                    PersonId = result.PersonId,
                    PersonName = result.PersonName,
                    Confidence = result.Confidence,
                    Status = result.Status,
                    Direction = direction,
                    CapturedAt = capturedAt,
                    FaceImageBase64 = dto.FaceCrop,
                };

                db.GateEvents.Add(gateEvent);
                await db.SaveChangesAsync(ct);
                GateEventChannel.Publish(gateEvent);
            }

            return Results.Ok(new
            {
                personId = result.PersonId?.ToString(),
                personName = result.PersonName,
                confidence = result.Confidence,
                timestamp = capturedAt.ToString("O"),
                direction = direction.ToString().ToLower(),
            });
        }).RequireRateLimiting("IdentifyPolicy");
    }
}

public class IdentifyRequestDto
{
    public float[] Embedding { get; set; } = [];

    [JsonPropertyName("frame_quality")]
    public float FrameQuality { get; set; }

    [JsonPropertyName("captured_at")]
    public string CapturedAt { get; set; } = "";

    [JsonPropertyName("direction")]
    public string? Direction { get; set; }

    [JsonPropertyName("face_crop")]
    public string? FaceCrop { get; set; }
}
