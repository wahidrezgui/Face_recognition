using System.Text.Json.Serialization;
using GateVision.Api.Domain;
using GateVision.Api.Infrastructure.Db;
using GateVision.Api.Services;

namespace GateVision.Api.Endpoints;

public static class IdentifyEndpoints
{
    public static void MapIdentifyEndpoints(this WebApplication app)
    {
        app.MapPost("/api/identify", async (IdentifyRequestDto dto, IdentificationService svc, EventBufferService buffer, ILogger<Program> logger, CancellationToken ct) =>
        {
            if (dto.Embedding.Length != 512)
                return Results.BadRequest($"Embedding must have exactly 512 dimensions, got {dto.Embedding.Length}");
            var capturedAt = DateTime.Parse(dto.CapturedAt).ToUniversalTime();
            var result = await svc.Identify(dto.Embedding, dto.FrameQuality, capturedAt);

            var direction = string.Equals(dto.Direction, "exit", StringComparison.OrdinalIgnoreCase)
                ? Direction.Exit
                : Direction.Entry;

            var eventId = Guid.NewGuid(); // Single ID shared by SSE + DB

            buffer.BufferOrUpdate(new BufferedTrack
            {
                Id = eventId,
                TrackId = dto.TrackId,
                PersonId = result.PersonId,
                PersonName = result.PersonName,
                Confidence = result.Confidence,
                Status = result.Status,
                Direction = direction,
                CapturedAt = capturedAt,
                FaceImageBase64 = dto.FaceCrop,
                WelcomeMessage = result.WelcomeMessage,
                Department = result.Department,
            });

            logger.LogDebug("Track {TrackId} buffered ({Person}, conf={Confidence})", dto.TrackId, result.PersonName, result.Confidence);

            var gateEvent = new GateEvent
            {
                Id = eventId,
                PersonId = result.PersonId,
                PersonName = result.PersonName,
                Confidence = result.Confidence,
                Status = result.Status,
                Direction = direction,
                CapturedAt = capturedAt,
                FaceImageBase64 = dto.FaceCrop,
                WelcomeMessage = result.WelcomeMessage,
                Department = result.Department,
            };

            GateEventChannel.Publish(gateEvent);

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

    [JsonPropertyName("track_id")]
    public int TrackId { get; set; }
}
