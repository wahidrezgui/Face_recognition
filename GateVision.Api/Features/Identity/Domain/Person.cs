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
    public string Department { get; private set; } = string.Empty;
    public EnrollmentStatus EnrollmentStatus { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public string? WelcomeMessage { get; private set; }

    // HR system fields
    public string? ExternalSourceId { get; private set; }
    public string? QrCode           { get; private set; }
    public int?    MilitaryNumber   { get; private set; }
    public string? PhoneNumber      { get; private set; }
    public string? FullNameEn       { get; private set; }
    public string? FullNameAr       { get; private set; }
    public int?    DepartmentId     { get; private set; }
    public int?    RankId           { get; private set; }
    public int?    NationalityId    { get; private set; }
    public bool    IsEmployee       { get; private set; } = true;
    public string? Qid              { get; private set; }
    public int?    DefaultBase      { get; private set; }
    public string? Remarks          { get; private set; }
    public string? BloodType        { get; private set; }
    public string? JobArabic        { get; private set; }

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

    public static Person CreateFromEmployee(EmployeeRow e)
    {
        var displayName = !string.IsNullOrWhiteSpace(e.FullNameEn)
            ? e.FullNameEn.Trim()
            : (e.FullNameAr ?? "Unknown").Trim();

        return new Person
        {
            Id               = Guid.NewGuid(),
            FullName         = displayName,
            Department       = $"Dept-{e.DepId}",
            EnrollmentStatus = EnrollmentStatus.Pending,
            CreatedAt        = DateTime.UtcNow,
            ExternalSourceId = $"mysql:{e.Id}",
            QrCode           = e.QrCode,
            MilitaryNumber   = e.MilitaryNumber,
            PhoneNumber      = e.PhoneNumber,
            FullNameEn       = e.FullNameEn,
            FullNameAr       = e.FullNameAr,
            DepartmentId     = e.DepId,
            RankId           = e.RankId,
            NationalityId    = e.NationalityId,
            IsEmployee       = e.IsEmployee != 0,
            Qid              = e.Qid,
            DefaultBase      = e.DefaultBase,
            Remarks          = e.Remarks,
            BloodType        = e.BloodType,
            JobArabic        = e.JobArabic,
        };
    }
}

public record PersonCacheData(string Name, string? Department, string? WelcomeMessage);

public record EmployeeRow(
    int Id,
    string? QrCode,
    int? MilitaryNumber,
    string? PhoneNumber,
    string? FullNameEn,
    string? FullNameAr,
    int DepId,
    int? RankId,
    int? NationalityId,
    int IsEmployee,
    string? Qid,
    int? DefaultBase,
    string? Remarks,
    string? BloodType,
    string? JobArabic,
    string? Photo);
