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
    public string? Direction { get; init; }
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
    public string Direction { get; init; } = "entry";
    public string GateId { get; init; } = "default";
}

public class IdentifyPersonHandler(
    IdentificationService identification,
    EventBufferService buffer,
    TrainingModeService trainingMode,
    LogUnknownService logUnknown,
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

        capturedAt = capturedAt.Kind switch
        {
            DateTimeKind.Utc => capturedAt,
            DateTimeKind.Local => capturedAt.ToUniversalTime(),
            _ => DateTime.SpecifyKind(capturedAt, DateTimeKind.Utc),
        };
        var recognition = await gateService.GetRecognitionSettingsAsync(effectiveGateId, ct);
        var result = await identification.Identify(cmd.Embedding, cmd.FrameQuality, capturedAt, recognition);

        var direction = string.Equals(cmd.Direction, "exit", StringComparison.OrdinalIgnoreCase)
            ? Direction.Exit
            : Direction.Entry;

        bool isIdentified = result.Status == EventStatus.Identified;
        bool isKnownPerson = result.PersonId.HasValue;
        bool isTrainingEvent = !isIdentified && !isKnownPerson && !logUnknown.Enabled;
        bool willPersist = isIdentified || isKnownPerson || logUnknown.Enabled || trainingMode.Enabled;

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
                Direction = direction,
                CapturedAt = capturedAt,
                FaceImageBase64 = cmd.FaceCrop,
                WelcomeMessage = result.WelcomeMessage,
                Department = result.Department,
                Emotion = cmd.Emotion,
                Age = cmd.Age,
                Gender = cmd.Gender,
                IsTrainingEvent = isTrainingEvent,
                AutoValidateThreshold = recognition.AutoValidateConfidence,
            });
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
            !welcomeDedup.ShouldPublish(effectiveGateId, result.PersonId, direction, capturedAt))
            suppressWelcome = true;

        if (publishToSse && !cmd.Replayed && !suppressWelcome)
        {
            var sseEvt = GateEvent.Reconstitute(
                eventId, effectiveGateId, result.PersonId, result.Confidence,
                result.Status, direction, capturedAt,
                cmd.FaceCrop, cmd.Emotion, cmd.Age, cmd.Gender);
            sseEvt.PersonName = result.PersonName;
            sseEvt.WelcomeMessage = result.WelcomeMessage;
            sseEvt.Department = result.Department;
            channelRegistry.Publish(effectiveGateId, sseEvt);
        }

        return Result<IdentifyPersonResult>.Ok(new IdentifyPersonResult
        {
            PersonId = result.PersonId?.ToString(),
            PersonName = result.PersonName,
            Confidence = result.Confidence,
            Timestamp = capturedAt.ToString("O"),
            Direction = direction.ToString().ToLower(),
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
