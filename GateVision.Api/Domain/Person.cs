namespace GateVision.Api.Domain;

public enum EnrollmentStatus
{
    Pending,
    Active,
    Suspended
}

public class Person
{
    public Guid Id { get; private set; }
    public string FullName { get; private set; } = string.Empty;
    public string Department { get; private set; } = string.Empty;
    public EnrollmentStatus EnrollmentStatus { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public string? WelcomeMessage { get; private set; }

    private Person() { }

    public static Person Create(string fullName, string department, string? welcomeMessage = null)
    {
        if (string.IsNullOrWhiteSpace(fullName))
            throw new ArgumentException("Full name is required.", nameof(fullName));

        return new Person
        {
            Id = Guid.NewGuid(),
            FullName = fullName.Trim(),
            Department = department.Trim(),
            WelcomeMessage = string.IsNullOrWhiteSpace(welcomeMessage) ? null : welcomeMessage.Trim(),
            EnrollmentStatus = EnrollmentStatus.Pending,
            CreatedAt = DateTime.UtcNow,
        };
    }

    public void UpdateProfile(string? fullName, string? department)
    {
        if (fullName is not null)
        {
            if (string.IsNullOrWhiteSpace(fullName))
                throw new ArgumentException("Full name cannot be empty.", nameof(fullName));
            FullName = fullName.Trim();
        }
        if (department is not null)
            Department = department.Trim();
    }

    public void UpdateWelcomeMessage(string? welcomeMessage) =>
        WelcomeMessage = string.IsNullOrWhiteSpace(welcomeMessage) ? null : welcomeMessage.Trim();

    public void Activate() => EnrollmentStatus = EnrollmentStatus.Active;

    public void Suspend() => EnrollmentStatus = EnrollmentStatus.Suspended;

    public void ResetToPending() => EnrollmentStatus = EnrollmentStatus.Pending;
}

public record PersonCacheData(string Name, string? Department, string? WelcomeMessage);
