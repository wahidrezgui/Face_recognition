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

    public static void MapPersonEndpoints(this WebApplication app)
    {
        app.MapGet("/api/persons/count", async (AppDbContext db, CancellationToken ct) =>
        {
            var count = await db.Persons.CountAsync(ct);
            return Results.Ok(new { count });
        });

        app.MapGet("/api/persons/{id:guid}", async (Guid id, AppDbContext db, CancellationToken ct) =>
        {
            var person = await db.Persons
                .Where(p => p.Id == id)
                .Select(p => new
                {
                    p.Id,
                    p.FullName,
                    p.Department,
                    enrollmentStatus = p.EnrollmentStatus.ToString(),
                    p.CreatedAt,
                    p.WelcomeMessage,
                })
                .FirstOrDefaultAsync(ct);
            return person is null ? Results.NotFound() : Results.Ok(person);
        });

        app.MapGet("/api/persons/{id:guid}/faces", async (Guid id, AppDbContext db, CancellationToken ct) =>
        {
            var faces = await db.Database.SqlQuery<FaceImageRow>(
                $"""SELECT "Id", "FaceImage" FROM face_embeddings WHERE "PersonId" = {id} AND "FaceImage" IS NOT NULL ORDER BY "CreatedAt" DESC""")
                .ToListAsync(ct);
            return Results.Ok(faces.Select(f => new { id = f.Id, imageUrl = $"/api/persons/{id}/face-image/{f.Id}" }));
        });

        app.MapGet("/api/persons/{id:guid}/face-image/{faceId:guid}", async (Guid id, Guid faceId, AppDbContext db, CancellationToken ct) =>
        {
            var face = await db.Database.SqlQuery<FaceImageRow>(
                $"""SELECT "Id", "FaceImage" FROM face_embeddings WHERE "Id" = {faceId} AND "PersonId" = {id} AND "FaceImage" IS NOT NULL""")
                .FirstOrDefaultAsync(ct);
            if (face?.FaceImage is null)
                return Results.NotFound();

            var filePath = Path.GetFullPath(Path.Combine(FaceImagesDir, face.FaceImage));
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
            var persons = await db.Database.SqlQuery<PersonRow>($"""
                SELECT p."Id", p."FullName", p."Department", p."EnrollmentStatus", p."CreatedAt",
                       CAST(COUNT(fe."Id") AS integer) AS "FaceCount", p."WelcomeMessage"
                FROM persons p
                LEFT JOIN face_embeddings fe ON fe."PersonId" = p."Id"
                GROUP BY p."Id", p."FullName", p."Department", p."EnrollmentStatus", p."CreatedAt", p."WelcomeMessage"
                ORDER BY p."FullName"
                """)
                .ToListAsync(ct);
            return Results.Ok(persons.Select(p => new
            {
                p.Id,
                p.FullName,
                p.Department,
                enrollmentStatus = p.EnrollmentStatus,
                p.CreatedAt,
                faceCount = p.FaceCount,
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
            await svc.Enroll(id, dto.Embeddings, dto.QualityScore, dto.FaceImages, ct);
            return Results.Ok(new { status = "enrolled" });
        });

        app.MapPatch("/api/persons/{id:guid}/status", async (Guid id, UpdateStatusDto dto, AppDbContext db, CancellationToken ct) =>
        {
            var person = await db.Persons.FindAsync([id], ct);
            if (person is null) return Results.NotFound();

            if (!Enum.TryParse<EnrollmentStatus>(dto.Status, true, out var status))
                return Results.BadRequest("Invalid status");

            person.EnrollmentStatus = status;
            await db.SaveChangesAsync(ct);
            return Results.Ok(new
            {
                person.Id,
                enrollmentStatus = person.EnrollmentStatus.ToString(),
            });
        });

        app.MapPatch("/api/persons/{id:guid}/welcome-message", async (Guid id, UpdateWelcomeMessageDto dto, AppDbContext db, CacheService cache, CancellationToken ct) =>
        {
            var person = await db.Persons.FindAsync([id], ct);
            if (person is null) return Results.NotFound();

            person.WelcomeMessage = string.IsNullOrWhiteSpace(dto.WelcomeMessage) ? null : dto.WelcomeMessage.Trim();
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
}

public class UpdateStatusDto
{
    public string Status { get; set; } = "";
}

public record PersonRow(Guid Id, string FullName, string Department, string EnrollmentStatus, DateTime CreatedAt, int FaceCount, string? WelcomeMessage);
public record FaceImageRow(Guid Id, string? FaceImage);
