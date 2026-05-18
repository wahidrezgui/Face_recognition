using GateVision.Api.Domain;
using GateVision.Api.Infrastructure.Db;
using GateVision.Api.Infrastructure.Redis;
using Microsoft.EntityFrameworkCore;

namespace GateVision.Api.Services;

public class EnrollmentService
{
    private readonly AppDbContext _db;
    private readonly CacheService _cache;
    private readonly ILogger<EnrollmentService> _logger;
    private readonly string _faceImagesDir;

    public EnrollmentService(
        AppDbContext db,
        CacheService cache,
        ILogger<EnrollmentService> logger,
        IWebHostEnvironment env)
    {
        _db = db;
        _cache = cache;
        _logger = logger;
        _faceImagesDir = Path.Combine(env.ContentRootPath, "FaceImages");
        Directory.CreateDirectory(_faceImagesDir);
    }

    public async Task<Person> CreatePerson(string fullName, string department, string? welcomeMessage = null, CancellationToken ct = default)
    {
        var person = new Person
        {
            Id = Guid.NewGuid(),
            FullName = fullName,
            Department = department,
            EnrollmentStatus = EnrollmentStatus.Pending,
            WelcomeMessage = string.IsNullOrWhiteSpace(welcomeMessage) ? null : welcomeMessage.Trim(),
        };
        _db.Persons.Add(person);
        await _db.SaveChangesAsync(ct);
        await _cache.SetPersonAsync(person.Id, person.FullName, person.Department, person.WelcomeMessage);
        return person;
    }

    public async Task Enroll(Guid personId, List<float[]> embeddings, float qualityScore, List<string>? faceImages = null, CancellationToken ct = default)
    {
        var person = await _db.Persons.FindAsync([personId], ct)
            ?? throw new InvalidOperationException("Person not found");

        var avgEmbedding = AverageEmbeddings(embeddings);

        var embeddingId = Guid.NewGuid();
        string? faceImagePath = null;

        var strategy = _db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            var faceImage = faceImages?.FirstOrDefault();

            if (faceImage is not null)
            {
                faceImagePath = await SaveFaceImageAsync(personId, embeddingId, faceImage, ct);
                await _db.Database.ExecuteSqlAsync(
                    $"""INSERT INTO face_embeddings ("Id", "PersonId", "Vector", "QualityScore", "CreatedAt", "FaceImage") VALUES ({embeddingId}, {personId}, {avgEmbedding}::vector, {qualityScore}, {DateTime.UtcNow}, {faceImagePath})""");
            }
            else
            {
                await _db.Database.ExecuteSqlAsync(
                    $"""INSERT INTO face_embeddings ("Id", "PersonId", "Vector", "QualityScore", "CreatedAt") VALUES ({embeddingId}, {personId}, {avgEmbedding}::vector, {qualityScore}, {DateTime.UtcNow})""");
            }

            person.EnrollmentStatus = EnrollmentStatus.Active;
            await _db.SaveChangesAsync(ct);

            await tx.CommitAsync(ct);
        });

        if (faceImages?.Any() == true && string.IsNullOrEmpty(faceImagePath))
            _logger.LogWarning("Face image provided but failed to save for person {PersonId}", personId);

        await _cache.RemovePersonAsync(personId);
        await _cache.SetPersonAsync(personId, person.FullName, person.Department, person.WelcomeMessage);
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
