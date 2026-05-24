namespace GateVision.Api.Domain;

public class TrainingEvent
{
    public Guid Id { get; set; }
    public string GateId { get; set; } = "default";
    public Guid? PersonId { get; set; }
    public float Confidence { get; set; }
    public EventStatus Status { get; set; } = EventStatus.NeedsReview;
    public Direction Direction { get; set; } = Direction.Entry;
    public DateTime CapturedAt { get; set; }
    public string? FaceImageBase64 { get; set; }
    public string? Emotion { get; set; }
    public int? Age { get; set; }
    public string? Gender { get; set; }
}
