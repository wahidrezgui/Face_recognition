using GateVision.Api.Features.AccessEvents.Domain;
using GateVision.Api.Features.GateOperations.Domain;
using GateVision.Api.Features.Identity.Domain;
using GateVision.Api.Shared.Infrastructure.Persistence;
using GateVision.Api.Shared.Infrastructure.Redis;
using GateVision.Api.Shared.Kernel;
using Microsoft.EntityFrameworkCore;

namespace GateVision.Api.Features.Identity.Application;

public class EnrollmentService
{
    private readonly AppDbContext _db;
    private readonly CacheService _cache;
    private readonly IVectorStore _vectorStore;
    private readonly ILogger<EnrollmentService> _logger;
    private readonly string _faceImagesDir;

    public EnrollmentService(
        AppDbContext db,
        CacheService cache,
        IVectorStore vectorStore,
        ILogger<EnrollmentService> logger,
        IWebHostEnvironment env)
    {
        _db = db;
        _cache = cache;
        _vectorStore = vectorStore;
        _logger = logger;
        _faceImagesDir = Path.Combine(env.ContentRootPath, "FaceImages");
        Directory.CreateDirectory(_faceImagesDir);
    }

    public async Task<Person> CreatePerson(string fullName, string? welcomeMessage = null, CancellationToken ct = default)
    {
        var person = Person.Create(fullName, welcomeMessage);
        _db.Persons.Add(person);
        await _db.SaveChangesAsync(ct);
        await _cache.SetPersonAsync(person.Id, person.FullName, person.WelcomeMessage);
        return person;
    }

    /// <summary>Enroll face embeddings for a person.
    /// When <paramref name="poses"/> are provided, each embedding is stored as a separate row
    /// (tagged with its pose) instead of being averaged into one. This enables multi-angle
    /// matching and per-pose progress tracking in the UI.</summary>
    public async Task Enroll(Guid personId, List<float[]> embeddings, float qualityScore,
        List<string>? faceImages = null, List<string>? poses = null, bool replace = false, CancellationToken ct = default)
    {
        var person = await _db.Persons.FindAsync([personId], ct)
            ?? throw new InvalidOperationException("Person not found");

        var strategy = _db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            if (replace)
            {
                // Delete all previous face images from disk
                var personDir = Path.Combine(_faceImagesDir, personId.ToString());
                if (Directory.Exists(personDir))
                {
                    try { Directory.Delete(personDir, recursive: true); }
                    catch (Exception ex) { _logger.LogWarning(ex, "Could not remove face image dir for {PersonId}", personId); }
                }
                // Wipe Qdrant points for this person
                try { await _vectorStore.DeleteByPersonAsync(personId); }
                catch (Exception ex) { _logger.LogWarning(ex, "Qdrant replace-cleanup failed for {PersonId}", personId); }
                _logger.LogInformation("Replaced all embeddings for person {PersonId}", personId);
            }

            if (poses is not null && poses.Count == embeddings.Count)
            {
                // ── Per-frame: store each embedding as a Qdrant point with pose tag ──
                for (var i = 0; i < embeddings.Count; i++)
                {
                    var eid = Guid.NewGuid();
                    var emb = embeddings[i];
                    var pose = poses[i];
                    string? facePath = null;

                    if (faceImages is not null && i < faceImages.Count && !string.IsNullOrEmpty(faceImages[i]))
                        facePath = await SaveFaceImageAsync(personId, eid, faceImages[i], ct);

                    try { await _vectorStore.UpsertAsync(eid, personId, emb, pose, qualityScore); }
                    catch (Exception ex) { _logger.LogWarning(ex, "Qdrant write failed for embedding {Eid}", eid); }
                }
            }
            else
            {
                // ── Legacy: average all embeddings, store as single Qdrant point ──
                var avg = AverageEmbeddings(embeddings);
                var eid = Guid.NewGuid();
                string? facePath = null;

                if (faceImages?.Any() == true)
                    facePath = await SaveFaceImageAsync(personId, eid, faceImages[0], ct);

                try { await _vectorStore.UpsertAsync(eid, personId, avg, null, qualityScore); }
                catch (Exception ex) { _logger.LogWarning(ex, "Qdrant write failed for averaged embedding {Eid}", eid); }
            }

            person.Activate();
            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        });

        _logger.LogInformation("Enrolled {Count} embedding(s) for person {PersonId} (pose-tagged: {HasPoses}, replace: {Replace})",
            embeddings.Count, personId, poses is not null && poses.Count == embeddings.Count, replace);

        await _cache.RemovePersonAsync(personId);
        await _cache.SetPersonAsync(personId, person.FullName, person.WelcomeMessage);
    }

    private async Task<string?> SaveFaceImageAsync(Guid personId, Guid embeddingId, string base64Jpeg, CancellationToken ct)
    {
        try
        {
            var personDir = Path.Combine(_faceImagesDir, personId.ToString());
            Directory.CreateDirectory(personDir);
            var filePath = Path.Combine(personDir, $"{embeddingId}.jpg");
            var bytes = Convert.FromBase64String(base64Jpeg);
            await File.WriteAllBytesAsync(filePath, bytes, ct);
            _logger.LogInformation("Saved face image for person {PersonId}: {Path}", personId, filePath);
            return $"{personId}/{embeddingId}.jpg";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save face image for person {PersonId}", personId);
            return null;
        }
    }

    private static float[] AverageEmbeddings(List<float[]> embeddings)
    {
        var count = embeddings.Count;
        if (count == 0) return [];
        var dim = embeddings[0].Length;
        var avg = new float[dim];
        for (var i = 0; i < count; i++)
            for (var j = 0; j < dim; j++)
                avg[j] += embeddings[i][j];
        for (var j = 0; j < dim; j++)
            avg[j] /= count;
        return avg;
    }
}
