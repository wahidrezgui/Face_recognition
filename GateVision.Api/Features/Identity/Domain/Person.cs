namespace GateVision.Api.Features.Identity.Domain;

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
    public EnrollmentStatus EnrollmentStatus { get; private set; }
    public string? WelcomeMessage { get; private set; }
    public string? ExternalSourceId { get; private set; }
    public int? MilitaryNumber { get; private set; }

    private Person() { }

    public static Person Create(string fullName, string? welcomeMessage = null)
    {
        if (string.IsNullOrWhiteSpace(fullName))
            throw new ArgumentException("Full name is required.", nameof(fullName));

        return new Person
        {
            Id = Guid.NewGuid(),
            FullName = fullName.Trim(),
            WelcomeMessage = string.IsNullOrWhiteSpace(welcomeMessage) ? null : welcomeMessage.Trim(),
            EnrollmentStatus = EnrollmentStatus.Pending,
        };
    }

    public void UpdateProfile(string? fullName)
    {
        if (fullName is null) return;

        if (string.IsNullOrWhiteSpace(fullName))
            throw new ArgumentException("Full name cannot be empty.", nameof(fullName));
        FullName = fullName.Trim();
    }

    public void UpdateWelcomeMessage(string? welcomeMessage) =>
        WelcomeMessage = string.IsNullOrWhiteSpace(welcomeMessage) ? null : welcomeMessage.Trim();

    public void Activate() => EnrollmentStatus = EnrollmentStatus.Active;

    public void Suspend() => EnrollmentStatus = EnrollmentStatus.Suspended;

    public void ResetToPending() => EnrollmentStatus = EnrollmentStatus.Pending;

    public static Person CreateFromEmployee(EmployeeRow e)
    {
        var displayName = !string.IsNullOrWhiteSpace(e.FullNameEn)
            ? e.FullNameEn.Trim()
            : (e.FullNameAr ?? "Unknown").Trim();

        return new Person
        {
            Id = Guid.NewGuid(),
            FullName = displayName,
            EnrollmentStatus = EnrollmentStatus.Pending,
            ExternalSourceId = e.Id.ToString(),
            MilitaryNumber = e.MilitaryNumber,
        };
    }
}

public record PersonCacheData(string Name, string? WelcomeMessage);

public record EmployeeRow(
    int Id,
    int? MilitaryNumber,
    string? FullNameEn,
    string? FullNameAr,
    string? Photo,
    int DepId,
    string? QrCode);
