namespace GateVision.Api.Domain;

public class TrainingEvent
{
    public Guid Id { get; private set; }
    public string GateId { get; private set; } = "default";
    public Guid? PersonId { get; private set; }
    public float Confidence { get; private set; }
    public EventStatus Status { get; private set; }
    public Direction Direction { get; private set; }
    public DateTime CapturedAt { get; private set; }
    public string? FaceImageBase64 { get; private set; }
    public string? Emotion { get; private set; }
    public int? Age { get; private set; }
    public string? Gender { get; private set; }

    private TrainingEvent() { }

    /// <summary>Creates a new training event from a detection requiring review.</summary>
    public static TrainingEvent Record(
        string gateId, Guid? personId, float confidence,
        Direction direction, DateTime capturedAt,
        string? faceImageBase64 = null, string? emotion = null,
        int? age = null, string? gender = null)
    {
        return new TrainingEvent
        {
            Id = Guid.NewGuid(),
            GateId = gateId,
            PersonId = personId,
            Confidence = confidence,
            Status = EventStatus.NeedsReview,
            Direction = direction,
            CapturedAt = capturedAt,
            FaceImageBase64 = faceImageBase64,
            Emotion = emotion,
            Age = age,
            Gender = gender,
        };
    }

    /// <summary>Reconstitutes an event from the in-memory buffer preserving its stable ID.</summary>
    public static TrainingEvent Reconstitute(
        Guid id, string gateId, Guid? personId, float confidence,
        EventStatus status, Direction direction, DateTime capturedAt,
        string? faceImageBase64 = null, string? emotion = null,
        int? age = null, string? gender = null)
    {
        return new TrainingEvent
        {
            Id = id,
            GateId = gateId,
            PersonId = personId,
            Confidence = confidence,
            Status = status,
            Direction = direction,
            CapturedAt = capturedAt,
            FaceImageBase64 = faceImageBase64,
            Emotion = emotion,
            Age = age,
            Gender = gender,
        };
    }

    public void AssignPerson(Guid personId)
    {
        PersonId = personId;
        Status = EventStatus.Identified;
    }

    public void MarkIdentified() => Status = EventStatus.Identified;
}
