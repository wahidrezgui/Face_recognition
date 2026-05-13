namespace GateVision.Api.Domain;

public class FaceEmbedding
{
    public Guid Id { get; set; }
    public Guid PersonId { get; set; }
    public float[] Vector { get; set; } = [];
    public float QualityScore { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? FaceImage { get; set; }
}
