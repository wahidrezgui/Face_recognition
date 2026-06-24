using System.Security.Claims;
using System.Text.Json.Serialization;
using GateVision.Api.Features.AccessEvents.Application;
using GateVision.Api.Shared.Kernel;

namespace GateVision.Api.Features.AccessEvents.Api;

public static class IdentifyEndpoints
{
    public static void MapIdentifyEndpoints(this WebApplication app)
    {
        app.MapPost("/api/v1/identify", async (
            HttpContext ctx,
            IdentifyRequestDto dto,
            IdentifyPersonHandler handler,
            CancellationToken ct) =>
        {
            var result = await handler.HandleAsync(new IdentifyPersonCommand
            {
                Embedding = dto.Embedding,
                FrameQuality = dto.FrameQuality,
                CapturedAt = dto.CapturedAt,
                FaceCrop = dto.FaceCrop,
                TrackId = dto.TrackId,
                GateId = dto.GateId,
                Replayed = dto.Replayed,
                Emotion = dto.Emotion,
                Age = dto.Age,
                Gender = dto.Gender,
                PersonId = dto.PersonId,
                PersonName = dto.PersonName,
                Confidence = dto.Confidence,
                WelcomeMessage = dto.WelcomeMessage,
                AuthenticatedGateId = ctx.User.FindFirstValue("GateId"),
            }, ct);

            if (!result.IsSuccess)
            {
                if (result.StatusCode == 403) return Results.Forbid();
                return Results.BadRequest(new { type = "https://tools.ietf.org/html/rfc7807", detail = result.Error });
            }

            return Results.Ok(new
            {
                personId = result.Value!.PersonId,
                personName = result.Value.PersonName,
                confidence = result.Value.Confidence,
                timestamp = result.Value.Timestamp,
                gateId = result.Value.GateId,
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

    [JsonPropertyName("face_crop")]
    public string? FaceCrop { get; set; }

    [JsonPropertyName("track_id")]
    public int TrackId { get; set; }

    [JsonPropertyName("gate_id")]
    public string? GateId { get; set; } = "default";

    [JsonPropertyName("replayed")]
    public bool Replayed { get; set; }

    [JsonPropertyName("emotion")]
    public string? Emotion { get; set; }

    [JsonPropertyName("age")]
    public int? Age { get; set; }

    [JsonPropertyName("gender")]
    public string? Gender { get; set; }

    [JsonPropertyName("person_id")]
    public string? PersonId { get; set; }

    [JsonPropertyName("person_name")]
    public string? PersonName { get; set; }

    [JsonPropertyName("confidence")]
    public float? Confidence { get; set; }

    [JsonPropertyName("welcome_message")]
    public string? WelcomeMessage { get; set; }
}
