namespace GateVision.Api.Domain;

public class Gate
{
    public Guid Id { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string PythonUrl { get; private set; } = string.Empty;
    public string? ApiKey { get; private set; }
    public string? StartCommand { get; private set; }
    public DateTime CreatedAt { get; private set; }

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
}
