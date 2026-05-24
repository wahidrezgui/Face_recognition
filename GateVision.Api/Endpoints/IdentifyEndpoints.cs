using System.Text.Json.Serialization;
using GateVision.Api.Domain;
using GateVision.Api.Infrastructure.Db;
using GateVision.Api.Services;

namespace GateVision.Api.Endpoints;

public static class IdentifyEndpoints
{
    public static void MapIdentifyEndpoints(this WebApplication app)
    {
        app.MapPost("/api/identify", async (IdentifyRequestDto dto, IdentificationService svc, EventBufferService buffer, TrainingModeService trainingMode, LogUnknownService logUnknown, ILogger<Program> logger, CancellationToken ct) =>
        {
            if (dto.Embedding.Length != 512)
                return Results.BadRequest($"Embedding must have exactly 512 dimensions, got {dto.Embedding.Length}");
            var capturedAt = DateTime.Parse(dto.CapturedAt).ToUniversalTime();
            var result = await svc.Identify(dto.Embedding, dto.FrameQuality, capturedAt);

            var direction = string.Equals(dto.Direction, "exit", StringComparison.OrdinalIgnoreCase)
                ? Direction.Exit
                : Direction.Entry;

            bool isIdentified = result.Status == EventStatus.Identified;
            // LogUnknown: store all detections in gate_events regardless of status
            bool isTrainingEvent = !isIdentified && !logUnknown.Enabled;
            bool willPersist = isIdentified || logUnknown.Enabled || trainingMode.Enabled;

            // Determine stable event ID: buffered tracks get a persistent ID; ephemeral events get a
            // one-shot Guid that is never stored (no review possible, just gate display).
            Guid eventId;
            bool publishToSse;
            if (willPersist)
            {
                var (eid, isNewBest) = buffer.BufferOrUpdate(new BufferedTrack
                {
                    Id = Guid.NewGuid(),
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
                    Emotion = dto.Emotion,
                    Age = dto.Age,
                    Gender = dto.Gender,
                    IsTrainingEvent = isTrainingEvent,
                });
                eventId = eid;
                publishToSse = isNewBest;
                logger.LogDebug("Track {TrackId} buffered ({Person}, conf={Confidence}, newBest={IsNewBest}, training={IsTraining})",
                    dto.TrackId, result.PersonName, result.Confidence, isNewBest, isTrainingEvent);
            }
            else
            {
                // Ephemeral (unrecognized, training off): one-shot Guid, always show on gate display.
                eventId = Guid.NewGuid();
                publishToSse = true;
                logger.LogDebug("Track {TrackId} skipped (NeedsReview + training mode off)", dto.TrackId);
            }

            // Publish to gate display only when this frame is the confidence best for its track.
            if (publishToSse)
            {
                GateEventChannel.Publish(new GateEvent
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
                    Emotion = dto.Emotion,
                    Age = dto.Age,
                    Gender = dto.Gender,
                });
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

    [JsonPropertyName("track_id")]
    public int TrackId { get; set; }

    [JsonPropertyName("emotion")]
    public string? Emotion { get; set; }

    [JsonPropertyName("age")]
    public int? Age { get; set; }

    [JsonPropertyName("gender")]
    public string? Gender { get; set; }
}
