namespace GateVision.Api.Features.GateOperations.Domain;

public record GateWorkflowSettings(
    float MinMatchScore,
    float IdentifyConfidenceThreshold,
    float AutoValidateConfidence,
    float MinFaceConfidence,
    bool LogUnknown,
    bool TrainingMode,
    int WelcomeCooldownSeconds,
    int BufferTrackExpirySeconds,
    int BufferPersonDedupSeconds,
    double RefireScoreDelta,
    int MinTrackHits,
    int DeskDisplaySeconds,
    int DeskEventLookbackSeconds,
    bool ShowNeedsReviewOnDesk)
{
    public static GateWorkflowSettings Default { get; } = new(
        0.35f, 0.80f, 0.85f, 0.50f, false, false,
        7, 3, 2, 0.03, 2, 10, 30, false);

    public GateRecognitionSettings Recognition => new(
        MinMatchScore,
        IdentifyConfidenceThreshold,
        AutoValidateConfidence,
        MinFaceConfidence,
        LogUnknown,
        TrainingMode);

    public static GateWorkflowSettings FromGate(Gate? gate) =>
        gate is null ? Default : new(
            (float)gate.MinMatchScore,
            (float)gate.IdentifyConfidenceThreshold,
            (float)gate.AutoValidateConfidence,
            (float)gate.MinFaceConfidence,
            gate.LogUnknown,
            gate.TrainingMode,
            gate.WelcomeCooldownSeconds,
            gate.BufferTrackExpirySeconds,
            gate.BufferPersonDedupSeconds,
            gate.RefireScoreDelta,
            gate.MinTrackHits,
            gate.DeskDisplaySeconds,
            gate.DeskEventLookbackSeconds,
            gate.ShowNeedsReviewOnDesk);
}
