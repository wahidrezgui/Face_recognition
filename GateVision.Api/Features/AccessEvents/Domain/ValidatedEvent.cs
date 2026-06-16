using GateVision.Api.Shared.Kernel;

namespace GateVision.Api.Features.AccessEvents.Domain;

public class ValidatedEvent
{
    public Guid Id { get; private set; }
    public Guid? GateEventId { get; private set; }
    public string GateId { get; private set; } = "default";
    public Guid? PersonId { get; private set; }
    public float Confidence { get; private set; }
    public Direction Direction { get; private set; }
    public DateTime CapturedAt { get; private set; }
    public string? FaceImageBase64 { get; private set; }
    public string? Emotion { get; private set; }
    public int? Age { get; private set; }
    public string? Gender { get; private set; }
    public ValidationSource ValidatedBy { get; private set; }
    public DateTime ValidatedAt { get; private set; }

    private ValidatedEvent() { }

    public static ValidatedEvent FromGateEvent(GateEvent evt, ValidationSource source)
    {
        return new ValidatedEvent
        {
            Id = Guid.NewGuid(),
            GateEventId = evt.Id,
            GateId = evt.GateId,
            PersonId = evt.PersonId,
            Confidence = evt.Confidence,
            Direction = evt.Direction,
            CapturedAt = evt.CapturedAt,
            FaceImageBase64 = evt.FaceImageBase64,
            Emotion = evt.Emotion,
            Age = evt.Age,
            Gender = evt.Gender,
            ValidatedBy = source,
            ValidatedAt = DateTime.UtcNow,
        };
    }

    public static ValidatedEvent FromBuffer(
        Guid? gateEventId, string gateId, Guid? personId, float confidence,
        Direction direction, DateTime capturedAt,
        string? faceImageBase64, string? emotion, int? age, string? gender,
        ValidationSource source)
    {
        return new ValidatedEvent
        {
            Id = Guid.NewGuid(),
            GateEventId = gateEventId,
            GateId = gateId,
            PersonId = personId,
            Confidence = confidence,
            Direction = direction,
            CapturedAt = capturedAt,
            FaceImageBase64 = faceImageBase64,
            Emotion = emotion,
            Age = age,
            Gender = gender,
            ValidatedBy = source,
            ValidatedAt = DateTime.UtcNow,
        };
    }
}
