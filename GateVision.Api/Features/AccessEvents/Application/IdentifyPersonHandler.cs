using GateVision.Api.Features.AccessEvents.Application;
using GateVision.Api.Features.AccessEvents.Domain;
using GateVision.Api.Features.AccessEvents.Infrastructure;
using GateVision.Api.Features.GateOperations.Infrastructure;
using GateVision.Api.Shared.Kernel;

namespace GateVision.Api.Features.AccessEvents.Application;

public class IdentifyPersonCommand
{
    public float[] Embedding { get; init; } = [];
    public float FrameQuality { get; init; }
    public string CapturedAt { get; init; } = "";
    public string? FaceCrop { get; init; }
    public int TrackId { get; init; }
    public string? GateId { get; init; }
    public bool Replayed { get; init; }
    public string? Emotion { get; init; }
    public int? Age { get; init; }
    public string? Gender { get; init; }
    public string? AuthenticatedGateId { get; init; }
}

public class IdentifyPersonResult
{
    public string? PersonId { get; init; }
    public string PersonName { get; init; } = "UNKNOWN";
    public float Confidence { get; init; }
    public string Timestamp { get; init; } = "";
    public string GateId { get; init; } = "default";
}

public class IdentifyPersonHandler(
    IdentificationService identification,
    EventBufferService buffer,
    GateChannelRegistry channelRegistry,
    GateService gateService,
    WelcomeDedupService welcomeDedup)
{
    public async Task<Result<IdentifyPersonResult>> HandleAsync(IdentifyPersonCommand cmd, CancellationToken ct)
    {
        if (cmd.Embedding.Length != 512)
            return Result<IdentifyPersonResult>.Fail($"Embedding must have exactly 512 dimensions, got {cmd.Embedding.Length}");

        var effectiveGateId = await ResolveEffectiveGateIdAsync(cmd.GateId, cmd.AuthenticatedGateId, ct);
        if (cmd.AuthenticatedGateId != null &&
            !string.Equals(cmd.AuthenticatedGateId, effectiveGateId, StringComparison.OrdinalIgnoreCase))
            return Result<IdentifyPersonResult>.Fail("Gate mismatch", 403);

        if (!DateTime.TryParse(cmd.CapturedAt, null, System.Globalization.DateTimeStyles.RoundtripKind, out var capturedAt))
            return Result<IdentifyPersonResult>.Fail($"Invalid CapturedAt format: '{cmd.CapturedAt}'");

        capturedAt = DateTimeUtils.NormalizeToUtc(capturedAt);
        var workflow = await gateService.GetWorkflowSettingsAsync(effectiveGateId, ct);
        var recognition = workflow.Recognition;
        var result = await identification.Identify(cmd.Embedding, cmd.FrameQuality, capturedAt, recognition);

        bool isIdentified = result.Status == EventStatus.Identified;
        bool isKnownPerson = result.PersonId.HasValue;
        bool isTrainingEvent = !isIdentified && !isKnownPerson && !recognition.LogUnknown;
        bool willPersist = isIdentified || isKnownPerson || recognition.LogUnknown || recognition.TrainingMode;

        var bufferSettings = new BufferSettings(
            TimeSpan.FromSeconds(workflow.BufferPersonDedupSeconds),
            TimeSpan.FromSeconds(workflow.BufferTrackExpirySeconds));
        var welcomeCooldown = TimeSpan.FromSeconds(workflow.WelcomeCooldownSeconds);

        Guid eventId;
        bool publishToSse;
        if (willPersist)
        {
            var (eid, isNewBest) = buffer.BufferOrUpdate(new BufferedTrack
            {
                Id = Guid.NewGuid(),
                TrackId = cmd.TrackId,
                GateId = effectiveGateId,
                PersonId = result.PersonId,
                PersonName = result.PersonName,
                Confidence = result.Confidence,
                Status = result.Status,
                CapturedAt = capturedAt,
                FaceImageBase64 = cmd.FaceCrop,
                WelcomeMessage = result.WelcomeMessage,
                Emotion = cmd.Emotion,
                Age = cmd.Age,
                Gender = cmd.Gender,
                IsTrainingEvent = isTrainingEvent,
                AutoValidateThreshold = recognition.AutoValidateConfidence,
            }, bufferSettings);
            eventId = eid;
            publishToSse = isNewBest;
        }
        else
        {
            eventId = Guid.NewGuid();
            publishToSse = true;
        }

        var suppressWelcome = false;
        if (publishToSse && !cmd.Replayed && isIdentified &&
            !welcomeDedup.ShouldPublish(effectiveGateId, result.PersonId, capturedAt, welcomeCooldown))
            suppressWelcome = true;

        if (publishToSse && !cmd.Replayed)
        {
            var sseEvt = GateEvent.Reconstitute(
                eventId, effectiveGateId, result.PersonId, result.Confidence,
                result.Status, capturedAt,
                cmd.FaceCrop, cmd.Emotion, cmd.Age, cmd.Gender);
            sseEvt.PersonName = result.PersonName;
            // suppressWelcome means "same person seen recently" — still push the event so the
            // desk page can update the face photo, but clear the greeting so no new card fires.
            sseEvt.WelcomeMessage = suppressWelcome ? null : result.WelcomeMessage;
            channelRegistry.Publish(effectiveGateId, sseEvt);
        }

        return Result<IdentifyPersonResult>.Ok(new IdentifyPersonResult
        {
            PersonId = result.PersonId?.ToString(),
            PersonName = result.PersonName,
            Confidence = result.Confidence,
            Timestamp = capturedAt.ToString("O"),
            GateId = effectiveGateId,
        });
    }

    private async Task<string> ResolveEffectiveGateIdAsync(string? requestGateId, string? authenticatedGateId, CancellationToken ct)
    {
        if (!string.IsNullOrWhiteSpace(authenticatedGateId))
            return authenticatedGateId.Trim().ToLowerInvariant();

        if (!string.IsNullOrWhiteSpace(requestGateId) &&
            !string.Equals(requestGateId, "default", StringComparison.OrdinalIgnoreCase))
            return requestGateId.Trim().ToLowerInvariant();

        var gates = await gateService.GetAllAsync(ct);
        if (gates.Count == 1)
            return gates[0].Id.ToString().ToLowerInvariant();

        return "default";
    }
}
