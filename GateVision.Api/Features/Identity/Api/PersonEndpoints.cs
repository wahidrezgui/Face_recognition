using GateVision.Api.Features.AccessEvents.Application;
using GateVision.Api.Features.AccessEvents.Infrastructure;
using GateVision.Api.Features.GateOperations.Domain;
using GateVision.Api.Features.GateOperations.Infrastructure;
using GateVision.Api.Features.HrSync.Application;
using GateVision.Api.Features.Identity.Application;
using GateVision.Api.Features.Identity.Domain;
using GateVision.Api.Features.Identity.Infrastructure;
using GateVision.Api.Shared.Infrastructure.Persistence;
using GateVision.Api.Shared.Infrastructure.Redis;
using GateVision.Api.Shared.Kernel;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GateVision.Api.Features.Identity.Api;

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

    private static bool HasProfileImage(Guid personId)
    {
        var dir = Path.Combine(FaceImagesDir, personId.ToString());
        return new[] { ".jpg", ".jpeg", ".png" }
            .Any(ext => File.Exists(Path.Combine(dir, $"profile{ext}")));
    }

    public static void MapPersonEndpoints(this WebApplication app)
    {
        app.MapGet("/api/v1/persons/count", async (AppDbContext db, CancellationToken ct) =>
        {
            var count = await db.Persons.CountAsync(ct);
            return Results.Ok(new { count });
        });

        app.MapGet("/api/v1/persons/{id:guid}", async (Guid id, AppDbContext db, CancellationToken ct) =>
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
                hasProfileImage = HasProfileImage(id),
                person.WelcomeMessage,
                person.ExternalSourceId,
                person.QrCode,
                person.MilitaryNumber,
                person.PhoneNumber,
                person.FullNameEn,
                person.FullNameAr,
                person.DepartmentId,
                person.RankId,
                person.NationalityId,
                person.IsEmployee,
                person.Qid,
                person.DefaultBase,
                person.Remarks,
                person.BloodType,
                person.JobArabic,
            });
        });

        app.MapGet("/api/v1/persons/{id:guid}/faces", (Guid id) =>
        {
            var dir = Path.Combine(FaceImagesDir, id.ToString());
            if (!Directory.Exists(dir)) return Results.Ok(Array.Empty<object>());

            var faces = Directory.EnumerateFiles(dir)
                .Where(f => Guid.TryParse(Path.GetFileNameWithoutExtension(f), out _))
                .Select(f =>
                {
                    var faceId = Path.GetFileNameWithoutExtension(f);
                    return new { id = faceId, imageUrl = $"/api/v1/persons/{id}/face-image/{faceId}" };
                })
                .ToArray();

            return Results.Ok(faces);
        });

        app.MapDelete("/api/v1/persons/{id:guid}/faces/{faceId:guid}", async (Guid id, Guid faceId, IVectorStore vectorStore, ILogger<Program> logger) =>
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

        app.MapDelete("/api/v1/persons/{id:guid}/faces", async (Guid id, IVectorStore vectorStore, ILogger<Program> logger) =>
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

        app.MapGet("/api/v1/persons/{id:guid}/face-image/{faceId:guid}", async (Guid id, Guid faceId) =>
        {
            var filePath = Path.GetFullPath(Path.Combine(FaceImagesDir, id.ToString(), $"{faceId}.jpg"));
            if (!filePath.StartsWith(FaceImagesDir + Path.DirectorySeparatorChar, StringComparison.Ordinal))
                return Results.NotFound();
            if (File.Exists(filePath))
                return Results.File(filePath, "image/jpeg");

            return Results.NotFound();
        });

        app.MapPost("/api/v1/persons/{id:guid}/upload-face", async (Guid id, HttpRequest request, AppDbContext db, ILogger<Program> logger, CancellationToken ct) =>
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

            return Results.Ok(new { imageUrl = $"/api/v1/persons/{id}/profile-image" });
        });

        app.MapGet("/api/v1/persons/{id:guid}/profile-image", async (Guid id, CancellationToken ct) =>
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

        app.MapGet("/api/v1/persons", async (
            AppDbContext db,
            CancellationToken ct,
            int page = 1,
            int pageSize = 50,
            string? search = null,
            string? status = null) =>
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 200);

            var query = db.Persons.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.ToLower();
                query = query.Where(p =>
                    p.FullName.ToLower().Contains(s) ||
                    (p.FullNameEn != null && p.FullNameEn.ToLower().Contains(s)) ||
                    (p.FullNameAr != null && p.FullNameAr.ToLower().Contains(s)));
            }

            if (!string.IsNullOrWhiteSpace(status) &&
                Enum.TryParse<EnrollmentStatus>(status, true, out var statusEnum))
                query = query.Where(p => p.EnrollmentStatus == statusEnum);

            var total = await query.CountAsync(ct);
            var persons = await query
                .OrderBy(p => p.FullName)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(ct);

            return Results.Ok(new
            {
                items = persons.Select(p => new
                {
                    p.Id,
                    p.FullName,
                    p.Department,
                    enrollmentStatus = p.EnrollmentStatus.ToString(),
                    p.CreatedAt,
                    faceCount = CountEnrolledFaces(p.Id),
                    hasProfileImage = HasProfileImage(p.Id),
                    welcomeMessage = p.WelcomeMessage,
                    p.ExternalSourceId,
                    p.QrCode,
                    p.MilitaryNumber,
                    p.PhoneNumber,
                    p.FullNameEn,
                    p.FullNameAr,
                    p.DepartmentId,
                    p.RankId,
                    p.NationalityId,
                    p.IsEmployee,
                    p.Qid,
                    p.DefaultBase,
                    p.Remarks,
                    p.BloodType,
                    p.JobArabic,
                }),
                total,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)total / pageSize),
            });
        });

        app.MapPost("/api/v1/persons", async (CreatePersonDto dto, EnrollmentService svc, CancellationToken ct) =>
        {
            var person = await svc.CreatePerson(dto.FullName, dto.Department, dto.WelcomeMessage, ct);
            return Results.Created($"/api/v1/persons/{person.Id}", new
            {
                person.Id,
                person.FullName,
                person.Department,
                enrollmentStatus = person.EnrollmentStatus.ToString(),
                person.WelcomeMessage,
            });
        });

        app.MapPost("/api/v1/persons/{id:guid}/enroll", async (Guid id, EnrollDto dto, EnrollmentService svc, CancellationToken ct) =>
        {
            for (var i = 0; i < dto.Embeddings.Count; i++)
                if (dto.Embeddings[i].Length != 512)
                    return Results.BadRequest($"Embedding at index {i} must have exactly 512 dimensions, got {dto.Embeddings[i].Length}");
            await svc.Enroll(id, dto.Embeddings, dto.QualityScore, dto.FaceImages, dto.Poses, dto.Replace, ct);
            return Results.Ok(new { status = "enrolled" });
        }).RequireRateLimiting("EnrollPolicy");

        app.MapGet("/api/v1/persons/{id:guid}/poses", async (Guid id, IVectorStore vectorStore) =>
        {
            var poses = await vectorStore.GetPosesByPersonAsync(id);
            var now = DateTime.UtcNow.ToString("o");
            return Results.Ok(poses.Select(p => new { pose = p, enrolledAt = now }));
        });

        app.MapPatch("/api/v1/persons/{id:guid}/status", async (Guid id, UpdateStatusDto dto, AppDbContext db, CancellationToken ct) =>
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

        app.MapDelete("/api/v1/persons/{id:guid}", async (Guid id, AppDbContext db, CacheService cache, IVectorStore vectorStore, ILogger<Program> logger, CancellationToken ct) =>
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

        app.MapPost("/api/v1/persons/bulk-enroll-profiles", async (
            BulkEnrollProfilesDto dto,
            AppDbContext db,
            GateService gateService,
            IHttpClientFactory httpClientFactory,
            ILogger<Program> logger,
            CancellationToken ct) =>
        {
            var gates = await gateService.GetAllAsync(ct);
            var gate = dto.GateId.HasValue
                ? gates.FirstOrDefault(g => g.Id == dto.GateId.Value)
                : gates.FirstOrDefault();

            if (gate is null)
                return Results.BadRequest(new { error = "No gate configured." });

            var pendingPersons = await db.Persons
                .AsNoTracking()
                .Where(p => p.EnrollmentStatus == EnrollmentStatus.Pending)
                .OrderBy(p => p.FullName)
                .ToListAsync(ct);

            int enrolled = 0, failed = 0, skipped = 0;
            var results = new List<BulkEnrollResultItem>();

            foreach (var person in pendingPersons)
            {
                var personDir = Path.Combine(FaceImagesDir, person.Id.ToString());
                string? filePath = null;
                foreach (var ext in new[] { ".jpg", ".jpeg", ".png" })
                {
                    var candidate = Path.Combine(personDir, $"profile{ext}");
                    if (File.Exists(candidate)) { filePath = candidate; break; }
                }

                if (filePath is null)
                {
                    skipped++;
                    results.Add(new BulkEnrollResultItem(person.Id, person.FullName, "skipped", "No profile image"));
                    continue;
                }

                try
                {
                    var bytes = await File.ReadAllBytesAsync(filePath, ct);
                    var b64 = Convert.ToBase64String(bytes);

                    var payload = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        personId = person.Id.ToString(),
                        frame = b64,
                    });

                    using var content = new StringContent(payload, System.Text.Encoding.UTF8, "application/json");
                    var http = httpClientFactory.CreateClient();
                    http.Timeout = TimeSpan.FromSeconds(30);
                    if (!string.IsNullOrEmpty(gate.ApiKey))
                        http.DefaultRequestHeaders.Add("X-API-Key", gate.ApiKey);
                    var resp = await http.PostAsync($"{gate.PythonUrl}/enroll/from-image", content, ct);

                    if (resp.IsSuccessStatusCode)
                    {
                        enrolled++;
                        results.Add(new BulkEnrollResultItem(person.Id, person.FullName, "enrolled", null));
                        logger.LogInformation("Bulk enrolled {PersonId} ({Name})", person.Id, person.FullName);
                    }
                    else
                    {
                        var body = await resp.Content.ReadAsStringAsync(ct);
                        failed++;
                        results.Add(new BulkEnrollResultItem(person.Id, person.FullName, "failed", $"HTTP {(int)resp.StatusCode}"));
                        logger.LogWarning("Bulk enroll failed for {PersonId}: {Status} {Body}", person.Id, (int)resp.StatusCode, body);
                    }
                }
                catch (Exception ex)
                {
                    failed++;
                    results.Add(new BulkEnrollResultItem(person.Id, person.FullName, "failed", ex.Message));
                    logger.LogWarning(ex, "Bulk enroll exception for {PersonId}", person.Id);
                }

                // Pace requests at ~3/sec so the Python callback doesn't saturate the EnrollPolicy rate limiter (5/sec)
                await Task.Delay(300, ct);
            }

            return Results.Ok(new { total = pendingPersons.Count, enrolled, failed, skipped, results });
        }).RequireAuthorization();

        app.MapDelete("/api/v1/persons/bulk", async (
            [FromBody] BulkDeletePersonsDto dto,
            AppDbContext db,
            CacheService cache,
            IVectorStore vectorStore,
            ILogger<Program> logger,
            CancellationToken ct) =>
        {
            if (dto.Ids is null or { Count: 0 })
                return Results.BadRequest(new { error = "No IDs provided" });

            var ids = dto.Ids.Distinct().ToList();
            var persons = await db.Persons
                .Where(p => ids.Contains(p.Id))
                .ToListAsync(ct);

            if (persons.Count == 0)
                return Results.Ok(new { deleted = 0 });

            // Delete embeddings from Qdrant and nullify gate event references for each person
            foreach (var person in persons)
            {
                try { await vectorStore.DeleteByPersonAsync(person.Id); }
                catch (Exception ex) { logger.LogWarning(ex, "Qdrant cleanup failed for person {PersonId}", person.Id); }

                await db.Database.ExecuteSqlAsync(
                    $"""UPDATE gate_events SET "PersonId" = NULL, "Status" = 'NeedsReview' WHERE "PersonId" = {person.Id}""", ct);
            }

            db.Persons.RemoveRange(persons);
            await db.SaveChangesAsync(ct);

            foreach (var person in persons)
            {
                var personDir = Path.Combine(FaceImagesDir, person.Id.ToString());
                if (Directory.Exists(personDir))
                {
                    try { Directory.Delete(personDir, true); }
                    catch (Exception ex) { logger.LogWarning(ex, "Could not delete directory for person {PersonId}", person.Id); }
                }
                await cache.RemovePersonAsync(person.Id);
                logger.LogInformation("Person {PersonId} ({Name}) bulk-deleted", person.Id, person.FullName);
            }

            return Results.Ok(new { deleted = persons.Count });
        }).RequireAuthorization();

        app.MapPatch("/api/v1/persons/{id:guid}", async (Guid id, UpdatePersonDto dto, AppDbContext db, CacheService cache, CancellationToken ct) =>
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

        app.MapPatch("/api/v1/persons/{id:guid}/welcome-message", async (Guid id, UpdateWelcomeMessageDto dto, AppDbContext db, CacheService cache, CancellationToken ct) =>
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

public class BulkDeletePersonsDto
{
    public List<Guid> Ids { get; set; } = [];
}

public class BulkEnrollProfilesDto
{
    public Guid? GateId { get; set; }
}

public record BulkEnrollResultItem(Guid PersonId, string FullName, string Status, string? Error);


