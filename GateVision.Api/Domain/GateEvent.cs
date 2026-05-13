namespace GateVision.Api.Domain;

public enum EventStatus
{
    Identified,
    NeedsReview,
    Unrecognized
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
    public string PersonName { get; set; } = "UNKNOWN";
    public float Confidence { get; set; }
    public EventStatus Status { get; set; }
    public Direction Direction { get; set; }
    public DateTime CapturedAt { get; set; }
    public string? FaceImageBase64 { get; set; }
    public string? FaceImagePath { get; set; }
}
