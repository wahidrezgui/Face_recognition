using System.ComponentModel.DataAnnotations.Schema;

namespace GateVision.Api.Domain;

public enum EventStatus
{
    Identified,
    NeedsReview
}

public enum Direction
{
    Entry,
    Exit
}

public class GateEvent
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

    // Not stored in DB — enriched at read time or before SSE publish
    [NotMapped] public string PersonName { get; set; } = "UNKNOWN";
    [NotMapped] public string? WelcomeMessage { get; set; }
    [NotMapped] public string? Department { get; set; }

    private GateEvent() { }

    /// <summary>Creates a new gate event originating from a detection.</summary>
    public static GateEvent Record(
        string gateId, Guid? personId, float confidence,
        EventStatus status, Direction direction, DateTime capturedAt,
        string? faceImageBase64 = null, string? emotion = null,
        int? age = null, string? gender = null)
    {
        return new GateEvent
        {
            Id = Guid.NewGuid(),
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

    /// <summary>Reconstitutes an event from the in-memory buffer preserving its stable ID.</summary>
    public static GateEvent Reconstitute(
        Guid id, string gateId, Guid? personId, float confidence,
        EventStatus status, Direction direction, DateTime capturedAt,
        string? faceImageBase64 = null, string? emotion = null,
        int? age = null, string? gender = null)
    {
        return new GateEvent
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

    public void MarkNeedsReview() => Status = EventStatus.NeedsReview;
}
