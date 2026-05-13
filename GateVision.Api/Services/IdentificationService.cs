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
                Status = EventStatus.Unrecognized,
            };
        }

        var confidence = (float)result.Confidence;

        if (confidence < 0.35f)
        {
            return new IdentifyResponse
            {
                PersonId = null,
                PersonName = "UNKNOWN",
                Confidence = confidence,
                Status = EventStatus.Unrecognized,
            };
        }
        EventStatus status;

        if (confidence >= 0.85f)
        {
            status = EventStatus.Identified;
        }
        else if (confidence >= 0.65f)
        {
            status = EventStatus.NeedsReview;
        }
        else
        {
            status = EventStatus.Unrecognized;
        }

        var personName = await _cache.GetAsync<string>($"person_name:{result.PersonId}");
        if (personName is null)
        {
            var person = await _db.Persons.AsNoTracking()
             
                .FirstOrDefaultAsync(p => p.Id == result.PersonId);
            personName = person?.FullName ?? "UNKNOWN";
            if (person is not null)
            {
                await _cache.SetAsync($"person_name:{result.PersonId}", personName);
            }
        }

        return new IdentifyResponse
        {
            PersonId = result.PersonId,
            PersonName = personName,
            Confidence = confidence,
            Status = status,
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
}
