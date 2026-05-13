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

    public EnrollmentService(
        AppDbContext db,
        CacheService cache,
        ILogger<EnrollmentService> logger)
    {
        _db = db;
        _cache = cache;
        _logger = logger;
    }

    public async Task<Person> CreatePerson(string fullName, string department, CancellationToken ct = default)
    {
        var person = new Person
        {
            Id = Guid.NewGuid(),
            FullName = fullName,
            Department = department,
            EnrollmentStatus = EnrollmentStatus.Pending,
        };
        _db.Persons.Add(person);
        await _db.SaveChangesAsync(ct);
        await _cache.SetAsync($"person_name:{person.Id}", person.FullName);
        return person;
    }

    public async Task Enroll(Guid personId, List<float[]> embeddings, float qualityScore, List<string>? faceImages = null, CancellationToken ct = default)
    {
        var person = await _db.Persons.FindAsync([personId], ct)
            ?? throw new InvalidOperationException("Person not found");

        var avgEmbedding = AverageEmbeddings(embeddings);

        var strategy = _db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            var faceImage = faceImages?.FirstOrDefault();
            if (faceImage is not null)
            {
                await _db.Database.ExecuteSqlAsync(
                    $"""INSERT INTO face_embeddings ("Id", "PersonId", "Vector", "QualityScore", "CreatedAt", "FaceImage") VALUES ({Guid.NewGuid()}, {personId}, {avgEmbedding}::vector, {qualityScore}, {DateTime.UtcNow}, {faceImage})""");
            }
            else
            {
                await _db.Database.ExecuteSqlAsync(
                    $"""INSERT INTO face_embeddings ("Id", "PersonId", "Vector", "QualityScore", "CreatedAt") VALUES ({Guid.NewGuid()}, {personId}, {avgEmbedding}::vector, {qualityScore}, {DateTime.UtcNow})""");
            }

            person.EnrollmentStatus = EnrollmentStatus.Active;
            await _db.SaveChangesAsync(ct);

            await tx.CommitAsync(ct);
        });

        await _cache.RemoveAsync($"person_name:{personId}");
        await _cache.SetAsync($"person_name:{personId}", person.FullName);
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
