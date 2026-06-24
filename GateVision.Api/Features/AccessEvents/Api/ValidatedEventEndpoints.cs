using GateVision.Api.Features.AccessEvents.Domain;
using GateVision.Api.Features.AccessEvents.Infrastructure;
using GateVision.Api.Features.Identity.Domain;
using GateVision.Api.Shared.Infrastructure.Persistence;
using GateVision.Api.Shared.Kernel;
using Microsoft.EntityFrameworkCore;

namespace GateVision.Api.Features.AccessEvents.Api;

public static class ValidatedEventEndpoints
{
    public static void MapValidatedEventEndpoints(this WebApplication app)
    {
        app.MapGet("/api/v1/validated-events", async (
            AppDbContext db, CancellationToken ct,
            int page = 1, int limit = 50,
            string? name = null,
            string? gateId = null,
            DateTime? from = null,
            DateTime? to = null) =>
        {
            limit = Math.Min(limit, 200);
            page = Math.Max(1, page);

            var query = db.ValidatedEvents.AsQueryable();

            if (from.HasValue) query = query.Where(e => e.CapturedAt >= DateTimeUtils.NormalizeToUtc(from.Value));
            if (to.HasValue) query = query.Where(e => e.CapturedAt < DateTimeUtils.NormalizeToUtc(to.Value));

            if (!string.IsNullOrWhiteSpace(gateId))
            {
                var normalizedGateId = gateId.Trim().ToLowerInvariant();
                query = query.Where(e => e.GateId.ToLower() == normalizedGateId);
            }

            if (!string.IsNullOrWhiteSpace(name))
            {
                var trimmed = name.Trim();
                var pattern = $"%{trimmed}%";
                var matchingIds = await db.Persons
                    .Where(p =>
                        EF.Functions.ILike(p.FullName, pattern) ||
                        (p.MilitaryNumber != null &&
                         EF.Functions.Like(p.MilitaryNumber.ToString(), $"%{trimmed}%")))
                    .Select(p => p.Id)
                    .ToListAsync(ct);
                query = query.Where(e => e.PersonId.HasValue && matchingIds.Contains(e.PersonId!.Value));
            }

            var total = await query.CountAsync(ct);

            var rawEvents = await query
                .OrderByDescending(e => e.ValidatedAt)
                .ThenByDescending(e => e.Id)
                .Skip((page - 1) * limit)
                .Take(limit)
                .ToListAsync(ct);

            var personIds = rawEvents
                .Where(e => e.PersonId.HasValue)
                .Select(e => e.PersonId!.Value)
                .Distinct()
                .ToList();
            var persons = personIds.Count > 0
                ? await db.Persons.Where(p => personIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, ct)
                : new Dictionary<Guid, Person>();

            var items = rawEvents.Select(e =>
            {
                var person = e.PersonId.HasValue ? persons.GetValueOrDefault(e.PersonId.Value) : null;
                return new
                {
                    eventId = e.Id,
                    gateEventId = e.GateEventId,
                    gateId = e.GateId,
                    personId = e.PersonId?.ToString(),
                    personName = person?.FullName ?? "UNKNOWN",
                    confidence = e.Confidence,
                    timestamp = e.CapturedAt.ToString("O"),
                    validatedBy = e.ValidatedBy.ToString().ToLower(),
                    validatedAt = e.ValidatedAt.ToString("O"),
                    faceImageBase64 = e.FaceImageBase64,
                    emotion = e.Emotion,
                    age = e.Age,
                    gender = e.Gender,
                };
            });

            return Results.Ok(new { items, total, page, limit });
        });

        app.MapPost("/api/v1/events/{id:guid}/validate", async (
            Guid id, ValidateEventDto dto,
            AppDbContext db, EventBufferService buffer,
            ILogger<Program> logger, CancellationToken ct) =>
        {
            GateEvent? gateEvt = await db.GateEvents.FindAsync([id], ct);

            if (gateEvt is null)
            {
                var flushed = await buffer.FindAndFlushAsync(db, id);
                gateEvt = flushed?.GateEvent;
            }

            if (gateEvt is null)
                return Results.NotFound(new { error = "Event not found" });

            if (dto.PersonId.HasValue)
            {
                var person = await db.Persons.FindAsync([dto.PersonId.Value], ct);
                if (person is null)
                    return Results.NotFound(new { error = "Person not found" });
                gateEvt.AssignPerson(dto.PersonId.Value);
            }

            if (!gateEvt.PersonId.HasValue)
                return Results.BadRequest(new { error = "Cannot validate an event with no linked person. Supply personId." });

            var alreadyExists = await db.ValidatedEvents
                .AnyAsync(v => v.GateEventId == id, ct);
            if (alreadyExists)
            {
                db.GateEvents.Remove(gateEvt);
                await db.SaveChangesAsync(ct);
                return Results.Conflict(new { error = "This event has already been validated." });
            }

            db.ValidatedEvents.Add(ValidatedEvent.FromGateEvent(gateEvt, ValidationSource.Manual));
            db.GateEvents.Remove(gateEvt);
            await db.SaveChangesAsync(ct);

            logger.LogInformation("Event {EventId} manually validated → validated_events (removed from gate_events)", id);

            var validated = await db.ValidatedEvents
                .FirstAsync(v => v.GateEventId == id, ct);

            var person2 = await db.Persons.FindAsync([gateEvt.PersonId!.Value], ct);
            return Results.Ok(new
            {
                validatedEventId = validated.Id,
                gateEventId = id,
                personId = gateEvt.PersonId?.ToString(),
                personName = person2?.FullName ?? "UNKNOWN",
                validatedBy = "manual",
                validatedAt = validated.ValidatedAt.ToString("O"),
            });
        }).RequireAuthorization();

        app.MapDelete("/api/v1/validated-events/{id:guid}", async (
            Guid id, AppDbContext db, ILogger<Program> logger, CancellationToken ct) =>
        {
            var evt = await db.ValidatedEvents.FindAsync([id], ct);
            if (evt is null) return Results.NotFound(new { error = "Validated event not found" });

            db.ValidatedEvents.Remove(evt);
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Validated event {Id} deleted", id);
            return Results.Ok(new { status = "deleted" });
        }).RequireAuthorization();

        app.MapGet("/api/v1/validated-events/stats", async (
            AppDbContext db, CancellationToken ct,
            string? gateId = null,
            DateTime? from = null,
            DateTime? to = null) =>
        {
            var query = db.ValidatedEvents.AsQueryable();
            if (from.HasValue) query = query.Where(e => e.CapturedAt >= DateTimeUtils.NormalizeToUtc(from.Value));
            if (to.HasValue) query = query.Where(e => e.CapturedAt < DateTimeUtils.NormalizeToUtc(to.Value));

            if (!string.IsNullOrWhiteSpace(gateId))
            {
                var normalizedGateId = gateId.Trim().ToLowerInvariant();
                query = query.Where(e => e.GateId.ToLower() == normalizedGateId);
            }

            var total = await query.CountAsync(ct);
            var autoCount = await query.Where(e => e.ValidatedBy == ValidationSource.Auto).CountAsync(ct);
            var manualCount = await query.Where(e => e.ValidatedBy == ValidationSource.Manual).CountAsync(ct);

            return Results.Ok(new { total, autoCount, manualCount });
        });
    }
}

public class ValidateEventDto
{
    public Guid? PersonId { get; set; }
}
