using GateVision.Api.Shared.Kernel;

namespace GateVision.Api.Features.AccessEvents.Domain;

public class GateEvent
{
    public Guid Id { get; private set; }
    public string GateId { get; private set; } = "default";
    public Guid? PersonId { get; private set; }
    public float Confidence { get; private set; }
    public EventStatus Status { get; private set; }
    public DateTime CapturedAt { get; private set; }
    public string? FaceImageBase64 { get; private set; }
    public string? Emotion { get; private set; }
    public int? Age { get; private set; }
    public string? Gender { get; private set; }

    [System.ComponentModel.DataAnnotations.Schema.NotMapped]
    public string PersonName { get; set; } = "UNKNOWN";
    [System.ComponentModel.DataAnnotations.Schema.NotMapped]
    public string? WelcomeMessage { get; set; }
    [System.ComponentModel.DataAnnotations.Schema.NotMapped]
    public string? Department { get; set; }

    private GateEvent() { }

    public static GateEvent Record(
        string gateId, Guid? personId, float confidence,
        EventStatus status, DateTime capturedAt,
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
            CapturedAt = capturedAt,
            FaceImageBase64 = faceImageBase64,
            Emotion = emotion,
            Age = age,
            Gender = gender,
        };
    }

    public static GateEvent Reconstitute(
        Guid id, string gateId, Guid? personId, float confidence,
        EventStatus status, DateTime capturedAt,
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
