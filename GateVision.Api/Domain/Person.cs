namespace GateVision.Api.Domain;

public enum EnrollmentStatus
{
    Pending,
    Active,
    Revoked,
    Suspended
}

public class Person
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public EnrollmentStatus EnrollmentStatus { get; set; } = EnrollmentStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? WelcomeMessage { get; set; }
}

public record PersonCacheData(string Name, string? Department, string? WelcomeMessage);
