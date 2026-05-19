using GateVision.Api.Domain;
using GateVision.Api.Infrastructure.Db;
using GateVision.Api.Infrastructure.Redis;
using Microsoft.EntityFrameworkCore;

namespace GateVision.Api.Services;

public class IdentificationService
{
    private readonly CacheService _cache;
    private readonly AppDbContext _db;
    private readonly ILogger<IdentificationService> _logger;

    public IdentificationService(
        CacheService cache,
        AppDbContext db,
        ILogger<IdentificationService> logger)
    {
        _cache = cache;
        _db = db;
        _logger = logger;
    }

    public async Task<IdentifyResponse> Identify(float[] embedding, float frameQuality, DateTime capturedAt)
    {
        var results = await _db.Database
            .SqlQueryRaw<IdentifyResult>(
                "SELECT fe.\"PersonId\" AS \"PersonId\", 1 - (fe.\"Vector\" <=> {0}::vector) AS \"Confidence\" " +
                "FROM face_embeddings fe " +
                "JOIN persons p ON p.\"Id\" = fe.\"PersonId\" " +
                "WHERE p.\"EnrollmentStatus\" = 'Active' " +
                "ORDER BY fe.\"Vector\" <=> {0}::vector " +
                "LIMIT 1",
                embedding).ToListAsync();


        var result = results.FirstOrDefault();

        if (result is null)
        {
            return new IdentifyResponse
            {
                PersonId = null,
                PersonName = "UNKNOWN",
                Confidence = 0,
                Status = EventStatus.NeedsReview,
            };
        }

        var confidence = (float)result.Confidence;
        if (float.IsNaN(confidence) || float.IsInfinity(confidence))
            confidence = 0f;

        if (confidence < 0.35f)
        {
            return new IdentifyResponse
            {
                PersonId = null,
                PersonName = "UNKNOWN",
                Confidence = confidence,
                Status = EventStatus.NeedsReview,
            };
        }
        EventStatus status;

        if (confidence >= 0.80f)
        {
            status = EventStatus.Identified;
        }
        else
        {
            status = EventStatus.NeedsReview;
        }

        // Single cache read — 1 key instead of 3 separate round-trips
        var cached = await _cache.GetPersonAsync(result.PersonId);
        string personName;
        string? welcomeMessage;
        string? department;

        if (cached is not null)
        {
            personName = cached.Name;
            department = cached.Department;
            welcomeMessage = cached.WelcomeMessage;
        }
        else
        {
            var person = await _db.Persons.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == result.PersonId);
            personName = person?.FullName ?? "UNKNOWN";
            welcomeMessage = person?.WelcomeMessage;
            department = person?.Department;
            if (person is not null)
                await _cache.SetPersonAsync(result.PersonId, personName, department, welcomeMessage);
        }

        return new IdentifyResponse
        {
            PersonId = result.PersonId,
            PersonName = personName,
            Confidence = confidence,
            Status = status,
            WelcomeMessage = string.IsNullOrEmpty(welcomeMessage) ? null : welcomeMessage,
            Department = string.IsNullOrEmpty(department) ? null : department,
        };
    }
}

public class IdentifyResult
{
    public Guid PersonId { get; set; }
    public double Confidence { get; set; }
}

public class IdentifyResponse
{
    public Guid? PersonId { get; set; }
    public string PersonName { get; set; } = "UNKNOWN";
    public float Confidence { get; set; }
    public EventStatus Status { get; set; }
    public string? WelcomeMessage { get; set; }
    public string? Department { get; set; }
}
