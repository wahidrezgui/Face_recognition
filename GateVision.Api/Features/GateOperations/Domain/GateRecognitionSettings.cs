namespace GateVision.Api.Features.GateOperations.Domain;

public record GateRecognitionSettings(
    float MinMatchScore,
    float IdentifyConfidenceThreshold,
    float AutoValidateConfidence,
    float MinFaceConfidence)
{
    public static GateRecognitionSettings Default { get; } = new(0.35f, 0.80f, 0.85f, 0.50f);

    public static GateRecognitionSettings FromGate(Gate? gate) =>
        gate is null ? Default : new(
            (float)gate.MinMatchScore,
            (float)gate.IdentifyConfidenceThreshold,
            (float)gate.AutoValidateConfidence,
            (float)gate.MinFaceConfidence);
}
