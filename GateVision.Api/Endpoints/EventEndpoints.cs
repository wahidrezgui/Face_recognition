using System.Text.Json;
using System.Threading.Channels;
using GateVision.Api.Domain;
using GateVision.Api.Infrastructure.Db;
using GateVision.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace GateVision.Api.Endpoints;

public static class EventEndpoints
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public static void MapEventEndpoints(this WebApplication app)
    {
        app.MapGet("/api/events", async (AppDbContext db, CancellationToken ct,
            int page = 1, int limit = 50,
            string? name = null, string? status = null,
            DateTime? from = null, DateTime? to = null) =>
        {
            limit = Math.Min(limit, 200);
            var query = db.GateEvents.AsQueryable();

            if (from.HasValue)
                query = query.Where(e => e.CapturedAt >= from.Value);
            if (to.HasValue)
                query = query.Where(e => e.CapturedAt < to.Value);

            if (!string.IsNullOrWhiteSpace(name))
            {
                var pattern = $"%{name}%";
                var matchingIds = await db.Persons
                    .Where(p => EF.Functions.ILike(p.FullName, pattern))
                    .Select(p => p.Id)
                    .ToListAsync(ct);
                query = query.Where(e => e.PersonId.HasValue && matchingIds.Contains(e.PersonId!.Value));
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                var statuses = status.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
                var parsed = statuses
                    .Select(s => Enum.TryParse<EventStatus>(s, true, out var st) ? st : (EventStatus?)null)
                    .Where(s => s.HasValue)
                    .Select(s => s!.Value)
                    .ToList();
                if (parsed.Count != 0)
                    query = query.Where(e => parsed.Contains(e.Status));
            }

            var total = await query.CountAsync(ct);

            var rawEvents = await query
                .OrderByDescending(e => e.CapturedAt)
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

            var events = rawEvents.Select(e =>
            {
                var person = e.PersonId.HasValue ? persons.GetValueOrDefault(e.PersonId.Value) : null;
                return new
                {
                    eventId = e.Id,
                    gateId = e.GateId,
                    personId = e.PersonId.HasValue ? e.PersonId.Value.ToString() : (string?)null,
                    personName = person?.FullName ?? "UNKNOWN",
                    confidence = e.Confidence,
                    timestamp = e.CapturedAt.ToString("O"),
                    direction = e.Direction.ToString().ToLower(),
                    status = e.Status.ToString(),
                    faceImageBase64 = e.FaceImageBase64,
                    emotion = e.Emotion,
                    age = e.Age,
                    gender = e.Gender,
                };
            });

            return Results.Ok(new { items = events, total, page, limit });
        });

        app.MapGet("/api/events/stats", async (AppDbContext db, CancellationToken ct) =>
        {
            var todayStart = DateTime.UtcNow.Date;
            var todayEnd = todayStart.AddDays(1);

            var todayEntries = await db.GateEvents
                .CountAsync(e => e.CapturedAt >= todayStart && e.CapturedAt < todayEnd, ct);

            var pendingReview = await db.TrainingEvents
                .CountAsync(e => e.Status == EventStatus.NeedsReview, ct);

            return Results.Ok(new { todayEntries, pendingReview });
        });

        app.MapGet("/api/events/activity", async (AppDbContext db, CancellationToken ct, string range = "today") =>
        {
            var (from, to, normalized) = ResolveActivityRange(range);
            var query = db.GateEvents.Where(e => e.CapturedAt >= from && e.CapturedAt < to);

            var total = await query.CountAsync(ct);
            var identified = await query.CountAsync(e => e.Status == EventStatus.Identified, ct);
            var needsReview = await query.CountAsync(e => e.Status == EventStatus.NeedsReview, ct);
            var entries = await query.CountAsync(e => e.Direction == Direction.Entry, ct);
            var exits = await query.CountAsync(e => e.Direction == Direction.Exit, ct);
            var uniquePersons = await query
                .Where(e => e.PersonId.HasValue)
                .Select(e => e.PersonId!.Value)
                .Distinct()
                .CountAsync(ct);
            var avgConfidence = total > 0
                ? await query.AverageAsync(e => (double)e.Confidence, ct)
                : 0.0;

            object? byHour = null;
            List<object> byDay;

            if (normalized == "today")
            {
                var hourly = await query
                    .GroupBy(e => e.CapturedAt.Hour)
                    .Select(g => new { hour = g.Key, total = g.Count() })
                    .ToListAsync(ct);
                byHour = Enumerable.Range(0, 24)
                    .Select(h => new
                    {
                        hour = h,
                        total = hourly.FirstOrDefault(x => x.hour == h)?.total ?? 0,
                    })
                    .ToList();
                var dayKey = from.ToString("yyyy-MM-dd");
                byDay = [new { date = dayKey, total, identified }];
            }
            else
            {
                var daily = await query
                    .GroupBy(e => e.CapturedAt.Date)
                    .Select(g => new
                    {
                        date = g.Key,
                        total = g.Count(),
                        identified = g.Count(e => e.Status == EventStatus.Identified),
                    })
                    .OrderBy(x => x.date)
                    .ToListAsync(ct);

                byDay = FillDailySeries(from, to, daily.Select(d => (
                    d.date.ToString("yyyy-MM-dd"),
                    d.total,
                    d.identified)));
            }

            return Results.Ok(new
            {
                range = normalized,
                from = from.ToString("O"),
                to = to.ToString("O"),
                total,
                identified,
                needsReview,
                entries,
                exits,
                uniquePersons,
                avgConfidence = Math.Round(avgConfidence, 3),
                byDay,
                byHour,
            });
        });

        app.MapPost("/api/events/{id:guid}/review", async (Guid id, ReviewEventDto dto, AppDbContext db, EventBufferService buffer, ILogger<Program> logger, CancellationToken ct) =>
        {
            // Search gate_events, then training_events, then in-memory buffer
            GateEvent? gateEvt = await db.GateEvents.FindAsync([id], ct);

            TrainingEvent? trainingEvt = null;
            if (gateEvt is null)
                trainingEvt = await db.TrainingEvents.FindAsync([id], ct);

            if (gateEvt is null && trainingEvt is null)
            {
                var flushed = await buffer.FindAndFlushAsync(db, id);
                if (flushed is not null)
                {
                    gateEvt = flushed.GateEvent;
                    trainingEvt = flushed.TrainingEvent;
                }
            }

            if (gateEvt is null && trainingEvt is null)
                return Results.NotFound(new { error = "Event not found" });

            var person = await db.Persons.FindAsync([dto.PersonId], ct);
            if (person is null)
                return Results.NotFound(new { error = "Person not found" });

            Guid eventId;
            if (gateEvt is not null)
            {
                gateEvt.Status = EventStatus.Identified;
                gateEvt.PersonId = dto.PersonId;
                eventId = gateEvt.Id;
            }
            else
            {
                trainingEvt!.Status = EventStatus.Identified;
                trainingEvt.PersonId = dto.PersonId;
                eventId = trainingEvt.Id;
            }

            await db.SaveChangesAsync(ct);
            logger.LogInformation("Event {EventId} reviewed and linked to person {PersonId}", eventId, dto.PersonId);

            return Results.Ok(new
            {
                eventId,
                personId = dto.PersonId.ToString(),
                personName = person.FullName,
                status = EventStatus.Identified.ToString(),
                department = person.Department,
                welcomeMessage = person.WelcomeMessage,
            });
        }).RequireAuthorization();

        app.MapDelete("/api/events/{id:guid}", async (Guid id, AppDbContext db, ILogger<Program> logger, CancellationToken ct) =>
        {
            var gateEvt = await db.GateEvents.FindAsync([id], ct);
            if (gateEvt is not null)
            {
                db.GateEvents.Remove(gateEvt);
                await db.SaveChangesAsync(ct);
                logger.LogInformation("Gate event {EventId} deleted", id);
                return Results.Ok(new { status = "deleted" });
            }

            var trainingEvt = await db.TrainingEvents.FindAsync([id], ct);
            if (trainingEvt is not null)
            {
                db.TrainingEvents.Remove(trainingEvt);
                await db.SaveChangesAsync(ct);
                logger.LogInformation("Training event {EventId} deleted", id);
                return Results.Ok(new { status = "deleted" });
            }

            return Results.NotFound(new { error = "Event not found" });
        }).RequireAuthorization();

        app.MapGet("/api/training-events", async (AppDbContext db, CancellationToken ct,
            int page = 1, int limit = 50,
            string? name = null, string? status = null) =>
        {
            limit = Math.Min(limit, 200);
            var query = db.TrainingEvents.AsQueryable();

            if (!string.IsNullOrWhiteSpace(name))
            {
                var pattern = $"%{name}%";
                var matchingIds = await db.Persons
                    .Where(p => EF.Functions.ILike(p.FullName, pattern))
                    .Select(p => p.Id)
                    .ToListAsync(ct);
                query = query.Where(e => e.PersonId.HasValue && matchingIds.Contains(e.PersonId!.Value));
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                var statuses = status.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
                var parsed = statuses
                    .Select(s => Enum.TryParse<EventStatus>(s, true, out var st) ? st : (EventStatus?)null)
                    .Where(s => s.HasValue)
                    .Select(s => s!.Value)
                    .ToList();
                if (parsed.Count != 0)
                    query = query.Where(e => parsed.Contains(e.Status));
            }

            var total = await query.CountAsync(ct);

            var rawEvents = await query
                .OrderByDescending(e => e.CapturedAt)
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

            var events = rawEvents.Select(e =>
            {
                var person = e.PersonId.HasValue ? persons.GetValueOrDefault(e.PersonId.Value) : null;
                return new
                {
                    eventId = e.Id,
                    gateId = e.GateId,
                    personId = e.PersonId.HasValue ? e.PersonId.Value.ToString() : (string?)null,
                    personName = person?.FullName ?? "UNKNOWN",
                    confidence = e.Confidence,
                    timestamp = e.CapturedAt.ToString("O"),
                    direction = e.Direction.ToString().ToLower(),
                    status = e.Status.ToString(),
                    faceImageBase64 = e.FaceImageBase64,
                    emotion = e.Emotion,
                    age = e.Age,
                    gender = e.Gender,
                };
            });

            return Results.Ok(new { items = events, total, page, limit });
        });

        app.MapGet("/api/events/stream", async (HttpContext ctx, AppDbContext db, GateChannelRegistry registry, CancellationToken ct) =>
        {
            await StreamEvents(ctx, db, registry.GetAllReader(), ct);
        });

        app.MapGet("/api/events/stream/{gateId}", async (string gateId, HttpContext ctx, AppDbContext db, GateChannelRegistry registry, CancellationToken ct) =>
        {
            await StreamEvents(ctx, db, registry.GetReader(gateId), ct);
        });

        app.MapGet("/api/gates", (GateChannelRegistry registry) =>
        {
            return Results.Ok(new { gates = registry.ActiveGateIds });
        });
    }

    static async Task StreamEvents(HttpContext ctx, AppDbContext db, ChannelReader<GateEvent> channel, CancellationToken ct)
    {
        ctx.Response.ContentType = "text/event-stream";
        ctx.Response.Headers.CacheControl = "no-cache";
        ctx.Response.Headers.Connection = "keep-alive";

        var lastTimestamp = DateTime.MinValue;
        if (ctx.Request.Headers.TryGetValue("Last-Event-Id", out var lastId) &&
            DateTime.TryParse(lastId, out var parsed))
        {
            lastTimestamp = parsed.Kind == DateTimeKind.Local ? parsed.ToUniversalTime() : parsed;
        }

        var todayStart = DateTime.UtcNow.Date;
        List<GateEvent> initialEvents;
        if (lastTimestamp == DateTime.MinValue)
        {
            initialEvents = await db.GateEvents
                .Where(e => e.CapturedAt >= todayStart && e.CapturedAt < todayStart.AddDays(1))
                .OrderByDescending(e => e.CapturedAt)
                .Take(10)
                .ToListAsync(ct);
        }
        else
        {
            initialEvents = await db.GateEvents
                .Where(e => e.CapturedAt > lastTimestamp
                         && e.CapturedAt >= todayStart
                         && e.CapturedAt < todayStart.AddDays(1))
                .OrderBy(e => e.CapturedAt)
                .Take(100)
                .ToListAsync(ct);
        }

        // Batch-load persons to populate [NotMapped] display fields before writing SSE
        var initPersonIds = initialEvents
            .Where(e => e.PersonId.HasValue)
            .Select(e => e.PersonId!.Value)
            .Distinct()
            .ToList();
        var initPersons = initPersonIds.Count > 0
            ? await db.Persons.Where(p => initPersonIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, ct)
            : new Dictionary<Guid, Person>();

        foreach (var evt in initialEvents)
        {
            if (evt.PersonId.HasValue && initPersons.TryGetValue(evt.PersonId.Value, out var p))
            {
                evt.PersonName = p.FullName;
                evt.WelcomeMessage = p.WelcomeMessage;
                evt.Department = p.Department;
            }
            if (evt.CapturedAt > lastTimestamp)
                lastTimestamp = evt.CapturedAt;
            await WriteEvent(ctx, evt, ct);
        }
        await ctx.Response.Body.FlushAsync(ct);

        var heartbeatInterval = 5000;
        while (!ct.IsCancellationRequested)
        {
            var readTask = channel.WaitToReadAsync(ct).AsTask();
            var heartbeatTask = Task.Delay(heartbeatInterval, CancellationToken.None);
            var done = await Task.WhenAny(readTask, heartbeatTask);

            if (done == readTask)
            {
                var hasItem = await readTask;
                if (hasItem)
                {
                    heartbeatInterval = 5000;
                    while (channel.TryRead(out var evt))
                    {
                        if (evt.CapturedAt > lastTimestamp)
                        {
                            lastTimestamp = evt.CapturedAt;
                            await WriteEvent(ctx, evt, ct);
                        }
                    }
                }
            }
            else
            {
                heartbeatInterval = Math.Min(heartbeatInterval + 5000, 30000);
                await ctx.Response.WriteAsync(": heartbeat\n\n", ct);
            }

            await ctx.Response.Body.FlushAsync(ct);
        }
    }

    static (DateTime from, DateTime to, string range) ResolveActivityRange(string range)
    {
        var todayStart = DateTime.UtcNow.Date;
        var tomorrow = todayStart.AddDays(1);
        return range.Trim().ToLowerInvariant() switch
        {
            "week" => (todayStart.AddDays(-6), tomorrow, "week"),
            "month" => (new DateTime(todayStart.Year, todayStart.Month, 1, 0, 0, 0, DateTimeKind.Utc), tomorrow, "month"),
            _ => (todayStart, tomorrow, "today"),
        };
    }

    static List<object> FillDailySeries(DateTime from, DateTime to, IEnumerable<(string date, int total, int identified)> rows)
    {
        var map = rows.ToDictionary(r => r.date, r => r);
        var list = new List<object>();
        for (var d = from.Date; d < to.Date; d = d.AddDays(1))
        {
            var key = d.ToString("yyyy-MM-dd");
            if (map.TryGetValue(key, out var row))
                list.Add(new { date = key, total = row.total, identified = row.identified });
            else
                list.Add(new { date = key, total = 0, identified = 0 });
        }
        return list;
    }

    static async Task WriteEvent(HttpContext ctx, GateEvent evt, CancellationToken ct)
    {
        var payload = JsonSerializer.Serialize(new
        {
            eventId = evt.Id,
            gateId = evt.GateId,
            personId = evt.PersonId?.ToString(),
            personName = evt.PersonName,
            confidence = evt.Confidence,
            timestamp = evt.CapturedAt.ToString("O"),
            direction = evt.Direction.ToString().ToLower(),
            status = evt.Status.ToString(),
            faceImageBase64 = evt.FaceImageBase64,
            welcomeMessage = evt.WelcomeMessage,
            department = evt.Department,
            emotion = evt.Emotion,
            age = evt.Age,
            gender = evt.Gender,
        }, JsonOpts);
        await ctx.Response.WriteAsync($"id: {evt.CapturedAt:O}\ndata: {payload}\n\n", ct);
    }
}

public class ReviewEventDto
{
    public Guid PersonId { get; set; }
}
