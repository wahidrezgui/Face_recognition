namespace GateVision.Api.Features.GateOperations.Domain;

public class Gate
{
    public Guid Id { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string PythonUrl { get; private set; } = string.Empty;
    public string? ApiKey { get; private set; }
    public string? StartCommand { get; private set; }
    public DateTime CreatedAt { get; private set; }

    public string CameraSource { get; private set; } = "0";
    public int ProcessingFps { get; private set; } = 3;
    public string ModelProfile { get; private set; } = "auto";
    public int? DetectorInputWidth { get; private set; }
    public int? DetectorInputHeight { get; private set; }
    public double MotionThreshold { get; private set; } = 0.02;
    public int MotionPixelThreshold { get; private set; } = 25;
    public int DetectMaxWidth { get; private set; } = 0;
    public string HikvisionUrl { get; private set; } = "";
    public string HikvisionUser { get; private set; } = "admin";
    public string? HikvisionPassword { get; private set; }
    public int HikvisionEventTtlMs { get; private set; } = 5000;
    public string HikvisionEventTypes { get; private set; } = "VMD,fielddetection,linedetection";
    public string HikvisionDetectionTarget { get; private set; } = "";

    public double MinMatchScore { get; private set; } = 0.35;
    public double IdentifyConfidenceThreshold { get; private set; } = 0.80;
    public double AutoValidateConfidence { get; private set; } = 0.85;
    public double MinFaceConfidence { get; private set; } = 0.50;

    public double TrackerMaxLostS { get; private set; } = 3.0;

    public bool LogUnknown { get; private set; } = false;
    public bool TrainingMode { get; private set; } = false;

    public int WelcomeCooldownSeconds { get; private set; } = 7;
    public int BufferTrackExpirySeconds { get; private set; } = 3;
    public int BufferPersonDedupSeconds { get; private set; } = 2;
    public double RefireScoreDelta { get; private set; } = 0.03;
    public int MinTrackHits { get; private set; } = 2;
    public int DeskDisplaySeconds { get; private set; } = 10;
    public int DeskEventLookbackSeconds { get; private set; } = 30;
    public bool ShowNeedsReviewOnDesk { get; private set; } = false;

    private Gate() { }

    public static Gate Create(string name, string pythonUrl, string? apiKey = null, string? startCommand = null)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Name is required.", nameof(name));
        if (string.IsNullOrWhiteSpace(pythonUrl))
            throw new ArgumentException("Python URL is required.", nameof(pythonUrl));

        return new Gate
        {
            Id = Guid.NewGuid(),
            Name = name.Trim(),
            PythonUrl = pythonUrl.Trim(),
            ApiKey = string.IsNullOrWhiteSpace(apiKey) ? null : apiKey.Trim(),
            StartCommand = string.IsNullOrWhiteSpace(startCommand) ? null : startCommand.Trim(),
            CreatedAt = DateTime.UtcNow,
        };
    }

    public void UpdateName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Name is required.", nameof(name));
        Name = name.Trim();
    }

    public void UpdatePythonUrl(string pythonUrl)
    {
        if (string.IsNullOrWhiteSpace(pythonUrl))
            throw new ArgumentException("Python URL is required.", nameof(pythonUrl));
        PythonUrl = pythonUrl.Trim();
    }

    public void UpdateApiKey(string? apiKey) =>
        ApiKey = string.IsNullOrWhiteSpace(apiKey) ? null : apiKey.Trim();

    public void UpdateStartCommand(string? startCommand) =>
        StartCommand = string.IsNullOrWhiteSpace(startCommand) ? null : startCommand.Trim();

    public void UpdateConfig(GateConfigUpdate dto)
    {
        if (dto.CameraSource is not null) CameraSource = dto.CameraSource;
        if (dto.ProcessingFps.HasValue) ProcessingFps = dto.ProcessingFps.Value;
        if (dto.ModelProfile is not null) ModelProfile = dto.ModelProfile;
        if (dto.DetectorInputWidth.HasValue) DetectorInputWidth = dto.DetectorInputWidth;
        if (dto.DetectorInputHeight.HasValue) DetectorInputHeight = dto.DetectorInputHeight;
        if (dto.ClearDetectorInputSize == true) { DetectorInputWidth = null; DetectorInputHeight = null; }
        if (dto.MotionThreshold.HasValue) MotionThreshold = dto.MotionThreshold.Value;
        if (dto.MotionPixelThreshold.HasValue) MotionPixelThreshold = dto.MotionPixelThreshold.Value;
        if (dto.DetectMaxWidth.HasValue) DetectMaxWidth = dto.DetectMaxWidth.Value;
        if (dto.HikvisionUrl is not null) HikvisionUrl = dto.HikvisionUrl;
        if (dto.HikvisionUser is not null) HikvisionUser = dto.HikvisionUser;
        if (dto.HikvisionPassword is not null) HikvisionPassword = dto.HikvisionPassword;
        if (dto.HikvisionEventTtlMs.HasValue) HikvisionEventTtlMs = dto.HikvisionEventTtlMs.Value;
        if (dto.HikvisionEventTypes is not null) HikvisionEventTypes = dto.HikvisionEventTypes;
        if (dto.HikvisionDetectionTarget is not null) HikvisionDetectionTarget = dto.HikvisionDetectionTarget;
        if (dto.MinMatchScore.HasValue) MinMatchScore = Clamp01(dto.MinMatchScore.Value);
        if (dto.IdentifyConfidenceThreshold.HasValue) IdentifyConfidenceThreshold = Clamp01(dto.IdentifyConfidenceThreshold.Value);
        if (dto.AutoValidateConfidence.HasValue) AutoValidateConfidence = Clamp01(dto.AutoValidateConfidence.Value);
        if (dto.MinFaceConfidence.HasValue) MinFaceConfidence = Clamp01(dto.MinFaceConfidence.Value);
        if (dto.TrackerMaxLostS.HasValue) TrackerMaxLostS = Math.Max(0.5, dto.TrackerMaxLostS.Value);
        if (dto.LogUnknown.HasValue) LogUnknown = dto.LogUnknown.Value;
        if (dto.TrainingMode.HasValue) TrainingMode = dto.TrainingMode.Value;
        if (dto.WelcomeCooldownSeconds.HasValue) WelcomeCooldownSeconds = Math.Max(1, dto.WelcomeCooldownSeconds.Value);
        if (dto.BufferTrackExpirySeconds.HasValue) BufferTrackExpirySeconds = Math.Max(1, dto.BufferTrackExpirySeconds.Value);
        if (dto.BufferPersonDedupSeconds.HasValue) BufferPersonDedupSeconds = Math.Max(0, dto.BufferPersonDedupSeconds.Value);
        if (dto.RefireScoreDelta.HasValue) RefireScoreDelta = Math.Clamp(dto.RefireScoreDelta.Value, 0.001, 0.5);
        if (dto.MinTrackHits.HasValue) MinTrackHits = Math.Max(1, dto.MinTrackHits.Value);
        if (dto.DeskDisplaySeconds.HasValue) DeskDisplaySeconds = Math.Max(1, dto.DeskDisplaySeconds.Value);
        if (dto.DeskEventLookbackSeconds.HasValue) DeskEventLookbackSeconds = Math.Max(1, dto.DeskEventLookbackSeconds.Value);
        if (dto.ShowNeedsReviewOnDesk.HasValue) ShowNeedsReviewOnDesk = dto.ShowNeedsReviewOnDesk.Value;
    }

    static double Clamp01(double v) => Math.Clamp(v, 0.01, 0.99);
}
