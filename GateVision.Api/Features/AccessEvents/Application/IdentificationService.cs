using GateVision.Api.Shared.Kernel;
using GateVision.Api.Features.Identity.Domain;
using GateVision.Api.Features.AccessEvents.Domain;
using GateVision.Api.Features.GateOperations.Domain;
using GateVision.Api.Shared.Infrastructure.Persistence;
using GateVision.Api.Shared.Infrastructure.Redis;
using Microsoft.EntityFrameworkCore;

namespace GateVision.Api.Features.AccessEvents.Application;

public class IdentificationService
{
    private readonly CacheService _cache;
    private readonly AppDbContext _db;
    private readonly IVectorStore _vectorStore;
    private readonly ILogger<IdentificationService> _logger;

    public IdentificationService(
        CacheService cache,
        AppDbContext db,
        IVectorStore vectorStore,
        ILogger<IdentificationService> logger)
    {
        _cache = cache;
        _db = db;
        _vectorStore = vectorStore;
        _logger = logger;
    }

    public async Task<IdentifyResponse> Identify(
        float[] embedding,
        float frameQuality,
        DateTime capturedAt,
        GateRecognitionSettings settings)
    {
        var match = await _vectorStore.FindMatchAsync(embedding, minScore: settings.MinMatchScore);

        if (match is null)
        {
            return new IdentifyResponse
            {
                PersonId = null,
                PersonName = "UNKNOWN",
                Confidence = 0,
                Status = EventStatus.NeedsReview,
            };
        }

        var confidence = match.Score;
        if (float.IsNaN(confidence) || float.IsInfinity(confidence))
            confidence = 0f;

        // 2. Resolve person metadata (cache → DB)
        var cached = await _cache.GetPersonAsync(match.PersonId);

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
                .FirstOrDefaultAsync(p => p.Id == match.PersonId);

            // Person deleted or status changed since embedding was stored
            if (person is null || person.EnrollmentStatus != EnrollmentStatus.Active)
            {
                return new IdentifyResponse
                {
                    PersonId = null,
                    PersonName = "UNKNOWN",
                    Confidence = confidence,
                    Status = EventStatus.NeedsReview,
                };
            }

            personName = person.FullName;
            welcomeMessage = person.WelcomeMessage;
            department = person.Department;
            await _cache.SetPersonAsync(match.PersonId, personName, department, welcomeMessage);
        }

        var status = confidence >= settings.IdentifyConfidenceThreshold
            ? EventStatus.Identified
            : EventStatus.NeedsReview;

        return new IdentifyResponse
        {
            PersonId = match.PersonId,
            PersonName = personName,
            Confidence = confidence,
            Status = status,
            WelcomeMessage = string.IsNullOrEmpty(welcomeMessage) ? null : welcomeMessage,
            Department = string.IsNullOrEmpty(department) ? null : department,
        };
    }
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
