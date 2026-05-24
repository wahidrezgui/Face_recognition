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
    public Guid Id { get; set; }
    public Guid? PersonId { get; set; }
    public float Confidence { get; set; }
    public EventStatus Status { get; set; }
    public Direction Direction { get; set; }
    public DateTime CapturedAt { get; set; }
    public string? FaceImageBase64 { get; set; }
    public string? Emotion { get; set; }
    public int? Age { get; set; }
    public string? Gender { get; set; }

    // Not stored in DB — populated from persons JOIN at read time, or set before SSE publish
    [NotMapped] public string PersonName { get; set; } = "UNKNOWN";
    [NotMapped] public string? WelcomeMessage { get; set; }
    [NotMapped] public string? Department { get; set; }
}
