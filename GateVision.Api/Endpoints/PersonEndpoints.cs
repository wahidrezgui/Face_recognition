using GateVision.Api.Domain;
using GateVision.Api.Infrastructure.Db;
using GateVision.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace GateVision.Api.Endpoints;

public static class PersonEndpoints
{
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
                })
                .FirstOrDefaultAsync(ct);
            return person is null ? Results.NotFound() : Results.Ok(person);
        });

        app.MapGet("/api/persons/{id:guid}/faces", async (Guid id, AppDbContext db, CancellationToken ct) =>
        {
            var faces = await db.Database.SqlQuery<FaceImageRow>(
                $"""SELECT "Id", "FaceImage" FROM face_embeddings WHERE "PersonId" = {id} AND "FaceImage" IS NOT NULL ORDER BY "CreatedAt" DESC""")
                .ToListAsync(ct);
            return Results.Ok(faces.Select(f => new { id = f.Id, image = f.FaceImage }));
        });

        app.MapGet("/api/persons", async (AppDbContext db, CancellationToken ct) =>
        {
            var persons = await db.Database.SqlQuery<PersonRow>($"""
                SELECT p."Id", p."FullName", p."Department", p."EnrollmentStatus", p."CreatedAt",
                       CAST(COUNT(fe."Id") AS integer) AS "FaceCount"
                FROM persons p
                LEFT JOIN face_embeddings fe ON fe."PersonId" = p."Id"
                GROUP BY p."Id", p."FullName", p."Department", p."EnrollmentStatus", p."CreatedAt"
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
            }));
        });

        app.MapPost("/api/persons", async (CreatePersonDto dto, EnrollmentService svc, CancellationToken ct) =>
        {
            var person = await svc.CreatePerson(dto.FullName, dto.Department, ct);
            return Results.Created($"/api/persons/{person.Id}", new
            {
                person.Id,
                person.FullName,
                person.Department,
                enrollmentStatus = person.EnrollmentStatus.ToString(),
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
    }
}

public class CreatePersonDto
{
    public string FullName { get; set; } = "";
    public string Department { get; set; } = "";
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

public record PersonRow(Guid Id, string FullName, string Department, string EnrollmentStatus, DateTime CreatedAt, int FaceCount);
public record FaceImageRow(Guid Id, string? FaceImage);
