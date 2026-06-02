using GateVision.Api.Domain;
using GateVision.Api.Infrastructure.Db;
using GateVision.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using GateVision.Api.Infrastructure.Redis;

namespace GateVision.Api.Endpoints;

public static class PersonEndpoints
{
    private static readonly string FaceImagesDir = Path.Combine(Directory.GetCurrentDirectory(), "FaceImages");

    private static int CountEnrolledFaces(Guid personId)
    {
        var dir = Path.Combine(FaceImagesDir, personId.ToString());
        if (!Directory.Exists(dir)) return 0;
        return Directory.EnumerateFiles(dir)
            .Count(f => Guid.TryParse(Path.GetFileNameWithoutExtension(f), out _));
    }

    public static void MapPersonEndpoints(this WebApplication app)
    {
        app.MapGet("/api/persons/count", async (AppDbContext db, CancellationToken ct) =>
        {
            var count = await db.Persons.CountAsync(ct);
            return Results.Ok(new { count });
        });

        app.MapGet("/api/persons/{id:guid}", async (Guid id, AppDbContext db, CancellationToken ct) =>
        {
            var person = await db.Persons.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == id, ct);

            if (person is null) return Results.NotFound();
            return Results.Ok(new
            {
                person.Id,
                person.FullName,
                person.Department,
                enrollmentStatus = person.EnrollmentStatus.ToString(),
                person.CreatedAt,
                faceCount = CountEnrolledFaces(id),
                person.WelcomeMessage,
            });
        });

        app.MapGet("/api/persons/{id:guid}/faces", (Guid id) =>
        {
            var dir = Path.Combine(FaceImagesDir, id.ToString());
            if (!Directory.Exists(dir)) return Results.Ok(Array.Empty<object>());

            var faces = Directory.EnumerateFiles(dir)
                .Where(f => Guid.TryParse(Path.GetFileNameWithoutExtension(f), out _))
                .Select(f =>
                {
                    var faceId = Path.GetFileNameWithoutExtension(f);
                    return new { id = faceId, imageUrl = $"/api/persons/{id}/face-image/{faceId}" };
                })
                .ToArray();

            return Results.Ok(faces);
        });

        app.MapDelete("/api/persons/{id:guid}/faces/{faceId:guid}", async (Guid id, Guid faceId, IVectorStore vectorStore, ILogger<Program> logger) =>
        {
            await vectorStore.DeleteByIdAsync(faceId);

            var dir = Path.Combine(FaceImagesDir, id.ToString());
            if (Directory.Exists(dir))
            {
                foreach (var file in Directory.GetFiles(dir, $"{faceId}.*"))
                    try { File.Delete(file); } catch (Exception ex) { logger.LogWarning(ex, "Could not delete {File}", file); }
            }

            return Results.Ok(new { status = "deleted" });
        });

        app.MapDelete("/api/persons/{id:guid}/faces", async (Guid id, IVectorStore vectorStore, ILogger<Program> logger) =>
        {
            await vectorStore.DeleteByPersonAsync(id);

            var dir = Path.Combine(FaceImagesDir, id.ToString());
            if (Directory.Exists(dir))
            {
                foreach (var file in Directory.GetFiles(dir).Where(f => Guid.TryParse(Path.GetFileNameWithoutExtension(f), out _)))
                    try { File.Delete(file); } catch (Exception ex) { logger.LogWarning(ex, "Could not delete {File}", file); }
            }

            return Results.Ok(new { status = "reset" });
        });

        app.MapGet("/api/persons/{id:guid}/face-image/{faceId:guid}", async (Guid id, Guid faceId) =>
        {
            var filePath = Path.GetFullPath(Path.Combine(FaceImagesDir, id.ToString(), $"{faceId}.jpg"));
            if (!filePath.StartsWith(FaceImagesDir + Path.DirectorySeparatorChar, StringComparison.Ordinal))
                return Results.NotFound();
            if (File.Exists(filePath))
                return Results.File(filePath, "image/jpeg");

            return Results.NotFound();
        });

        app.MapPost("/api/persons/{id:guid}/upload-face", async (Guid id, HttpRequest request, AppDbContext db, ILogger<Program> logger, CancellationToken ct) =>
        {
            var person = await db.Persons.FindAsync([id], ct);
            if (person is null)
                return Results.NotFound();

            if (!request.HasFormContentType || !request.Form.Files.Any())
                return Results.BadRequest(new { error = "No file uploaded" });

            var file = request.Form.Files[0];
            if (file.Length == 0)
                return Results.BadRequest(new { error = "Empty file" });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (ext != ".jpg" && ext != ".jpeg" && ext != ".png")
                return Results.BadRequest(new { error = "Only .jpg, .jpeg, .png files are allowed" });

            var personDir = Path.Combine(FaceImagesDir, id.ToString());
            Directory.CreateDirectory(personDir);
            var fileName = $"profile{ext}";
            var filePath = Path.Combine(personDir, fileName);

            await using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream, ct);
            }

            logger.LogInformation("Profile picture saved for person {PersonId}: {Path}", id, filePath);

            return Results.Ok(new { imageUrl = $"/api/persons/{id}/profile-image" });
        });

        app.MapGet("/api/persons/{id:guid}/profile-image", async (Guid id, CancellationToken ct) =>
        {
            var personDir = Path.Combine(FaceImagesDir, id.ToString());
            foreach (var ext in new[] { ".jpg", ".jpeg", ".png" })
            {
                var filePath = Path.GetFullPath(Path.Combine(personDir, $"profile{ext}"));
                if (!filePath.StartsWith(FaceImagesDir + Path.DirectorySeparatorChar, StringComparison.Ordinal))
                    continue;
                if (File.Exists(filePath))
                    return Results.File(filePath, ext == ".png" ? "image/png" : "image/jpeg");
            }
            return Results.NotFound();
        });

        app.MapGet("/api/persons", async (AppDbContext db, CancellationToken ct) =>
        {
            var persons = await db.Persons.AsNoTracking()
                .OrderBy(p => p.FullName)
                .ToListAsync(ct);
            return Results.Ok(persons.Select(p => new
            {
                p.Id,
                p.FullName,
                p.Department,
                enrollmentStatus = p.EnrollmentStatus.ToString(),
                p.CreatedAt,
                faceCount = CountEnrolledFaces(p.Id),
                welcomeMessage = p.WelcomeMessage,
            }));
        });

        app.MapPost("/api/persons", async (CreatePersonDto dto, EnrollmentService svc, CancellationToken ct) =>
        {
            var person = await svc.CreatePerson(dto.FullName, dto.Department, dto.WelcomeMessage, ct);
            return Results.Created($"/api/persons/{person.Id}", new
            {
                person.Id,
                person.FullName,
                person.Department,
                enrollmentStatus = person.EnrollmentStatus.ToString(),
                person.WelcomeMessage,
            });
        });

        app.MapPost("/api/persons/{id:guid}/enroll", async (Guid id, EnrollDto dto, EnrollmentService svc, CancellationToken ct) =>
        {
            for (var i = 0; i < dto.Embeddings.Count; i++)
                if (dto.Embeddings[i].Length != 512)
                    return Results.BadRequest($"Embedding at index {i} must have exactly 512 dimensions, got {dto.Embeddings[i].Length}");
            await svc.Enroll(id, dto.Embeddings, dto.QualityScore, dto.FaceImages, dto.Poses, dto.Replace, ct);
            return Results.Ok(new { status = "enrolled" });
        }).RequireRateLimiting("EnrollPolicy");

        app.MapGet("/api/persons/{id:guid}/poses", async (Guid id, IVectorStore vectorStore) =>
        {
            var poses = await vectorStore.GetPosesByPersonAsync(id);
            var now = DateTime.UtcNow.ToString("o");
            return Results.Ok(poses.Select(p => new { pose = p, enrolledAt = now }));
        });

        app.MapPatch("/api/persons/{id:guid}/status", async (Guid id, UpdateStatusDto dto, AppDbContext db, CancellationToken ct) =>
        {
            var person = await db.Persons.FindAsync([id], ct);
            if (person is null) return Results.NotFound();

            if (!Enum.TryParse<EnrollmentStatus>(dto.Status, true, out var status))
                return Results.BadRequest("Invalid status");

            switch (status)
            {
                case EnrollmentStatus.Active:    person.Activate();        break;
                case EnrollmentStatus.Suspended: person.Suspend();         break;
                case EnrollmentStatus.Pending:   person.ResetToPending();  break;
            }
            await db.SaveChangesAsync(ct);
            return Results.Ok(new
            {
                person.Id,
                enrollmentStatus = person.EnrollmentStatus.ToString(),
            });
        });

        app.MapDelete("/api/persons/{id:guid}", async (Guid id, AppDbContext db, CacheService cache, IVectorStore vectorStore, ILogger<Program> logger, CancellationToken ct) =>
        {
            var person = await db.Persons.FindAsync([id], ct);
            if (person is null)
                return Results.NotFound(new { error = "Person not found" });

            // Delete face embeddings from Qdrant (best-effort)
            try { await vectorStore.DeleteByPersonAsync(id); }
            catch (Exception ex) { logger.LogWarning(ex, "Qdrant cleanup failed for person {PersonId}", id); }

            // Nullify person references in gate events — preserve audit trail
            await db.Database.ExecuteSqlAsync(
                $"""UPDATE gate_events SET "PersonId" = NULL, "Status" = 'NeedsReview' WHERE "PersonId" = {id}""", ct);

            // Remove person record
            db.Persons.Remove(person);
            await db.SaveChangesAsync(ct);

            // Remove face images from disk
            var personDir = Path.Combine(FaceImagesDir, id.ToString());
            if (Directory.Exists(personDir))
                Directory.Delete(personDir, true);

            // Clear Redis cache
            await cache.RemovePersonAsync(id);

            logger.LogInformation("Person {PersonId} ({Name}) deleted", id, person.FullName);
            return Results.Ok(new { status = "deleted" });
        }).RequireAuthorization();

        app.MapPatch("/api/persons/{id:guid}", async (Guid id, UpdatePersonDto dto, AppDbContext db, CacheService cache, CancellationToken ct) =>
        {
            var person = await db.Persons.FindAsync([id], ct);
            if (person is null) return Results.NotFound();

            person.UpdateProfile(dto.FullName, dto.Department);
            await db.SaveChangesAsync(ct);
            await cache.RemovePersonAsync(id);

            return Results.Ok(new
            {
                person.Id,
                person.FullName,
                person.Department,
                enrollmentStatus = person.EnrollmentStatus.ToString(),
                person.WelcomeMessage,
            });
        });

        app.MapPatch("/api/persons/{id:guid}/welcome-message", async (Guid id, UpdateWelcomeMessageDto dto, AppDbContext db, CacheService cache, CancellationToken ct) =>
        {
            var person = await db.Persons.FindAsync([id], ct);
            if (person is null) return Results.NotFound();

            person.UpdateWelcomeMessage(dto.WelcomeMessage);
            await db.SaveChangesAsync(ct);
            await cache.RemovePersonAsync(id);
            if (person.WelcomeMessage is not null)
                await cache.SetPersonAsync(id, person.FullName, person.Department, person.WelcomeMessage);

            return Results.Ok(new { person.Id, person.WelcomeMessage });
        });
    }
}

public class CreatePersonDto
{
    public string FullName { get; set; } = "";
    public string Department { get; set; } = "";
    public string? WelcomeMessage { get; set; }
}

public class UpdateWelcomeMessageDto
{
    public string? WelcomeMessage { get; set; }
}

public class EnrollDto
{
    public List<float[]> Embeddings { get; set; } = [];
    public float QualityScore { get; set; } = 0.8f;
    public List<string>? FaceImages { get; set; }
    /// <summary>Pose label per embedding: 'frontal', 'left', 'right', 'up', 'down'. Index-parallel with Embeddings.</summary>
    public List<string>? Poses { get; set; }
    /// <summary>When true, all existing embeddings for this person are deleted before inserting the new ones.
    /// Use this when replacing gate-camera embeddings with higher-quality webcam frames.</summary>
    public bool Replace { get; set; } = false;
}

public class UpdatePersonDto
{
    public string? FullName { get; set; }
    public string? Department { get; set; }
}

public class UpdateStatusDto
{
    public string Status { get; set; } = "";
}


