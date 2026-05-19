using System.Text.Json;
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
            string? name = null, string? status = null) =>
        {
            limit = Math.Min(limit, 200);
            var query = db.GateEvents.AsQueryable();

            if (!string.IsNullOrWhiteSpace(name))
            {
                var pattern = $"%{name}%";
                query = query.Where(e => EF.Functions.ILike(e.PersonName, pattern));
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
                {
                    query = query.Where(e => parsed.Contains(e.Status));
                }
            }

            var total = await query.CountAsync(ct);

            var rawEvents = await query
                .OrderByDescending(e => e.CapturedAt)
                .Skip((page - 1) * limit)
                .Take(limit)
                .ToListAsync(ct);

            var events = rawEvents.Select(e => new
            {
                eventId = e.Id,
                personId = e.PersonId.HasValue ? e.PersonId.Value.ToString() : null,
                personName = e.PersonName,
                confidence = e.Confidence,
                timestamp = e.CapturedAt.ToString("O"),
                direction = e.Direction.ToString().ToLower(),
                status = e.Status.ToString(),
                faceImageUrl = e.FaceImagePath is not null ? $"/api/events/{e.Id}/image" : null,
                faceImageBase64 = e.FaceImagePath is null ? e.FaceImageBase64 : null,
            });

            return Results.Ok(new { items = events, total, page, limit });
        });

        app.MapGet("/api/events/stats", async (AppDbContext db, CancellationToken ct) =>
        {
            var todayStart = DateTime.UtcNow.Date;
            var todayEnd = todayStart.AddDays(1);

            var stats = await db.GateEvents
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    todayEntries = g.Count(e => e.CapturedAt >= todayStart && e.CapturedAt < todayEnd),
                    pendingReview = g.Count(e => e.Status == EventStatus.NeedsReview || e.Status == EventStatus.Unrecognized),
                })
                .OrderByDescending(_ => _.todayEntries)
                .FirstOrDefaultAsync(ct);

            return Results.Ok(stats ?? new { todayEntries = 0, pendingReview = 0 });
        });

        app.MapPost("/api/events/{id:guid}/review", async (Guid id, ReviewEventDto dto, AppDbContext db, ILogger<Program> logger, CancellationToken ct) =>
        {
            var evt = await db.GateEvents.FindAsync([id], ct);
            if (evt is null)
                return Results.NotFound(new { error = "Event not found" });

            var person = await db.Persons.FindAsync([dto.PersonId], ct);
            if (person is null)
                return Results.NotFound(new { error = "Person not found" });

            evt.Status = EventStatus.Identified;
            evt.PersonId = dto.PersonId;
            evt.PersonName = person.FullName;
            evt.Department = person.Department;
            evt.WelcomeMessage = person.WelcomeMessage;

            await db.SaveChangesAsync(ct);
            logger.LogInformation("Event {EventId} reviewed and linked to person {PersonId}", id, dto.PersonId);

            return Results.Ok(new
            {
                eventId = evt.Id,
                personId = evt.PersonId.ToString(),
                personName = evt.PersonName,
                status = evt.Status.ToString(),
                department = evt.Department,
                welcomeMessage = evt.WelcomeMessage,
            });
        }).RequireAuthorization();

        app.MapDelete("/api/events/{id:guid}", async (Guid id, AppDbContext db, ILogger<Program> logger, CancellationToken ct) =>
        {
            var evt = await db.GateEvents.FindAsync([id], ct);
            if (evt is null)
                return Results.NotFound(new { error = "Event not found" });

            db.GateEvents.Remove(evt);
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Event {EventId} deleted", id);

            return Results.Ok(new { status = "deleted" });
        }).RequireAuthorization();

        app.MapGet("/api/events/stream", async (HttpContext ctx, AppDbContext db, CancellationToken ct) =>
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

            foreach (var evt in initialEvents)
            {
                if (evt.CapturedAt > lastTimestamp)
                    lastTimestamp = evt.CapturedAt;
                await WriteEvent(ctx, evt, ct);
            }
            await ctx.Response.Body.FlushAsync(ct);

            var channel = GateEventChannel.Reader;
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
        });
    }

    static async Task WriteEvent(HttpContext ctx, GateEvent evt, CancellationToken ct)
    {
        var payload = JsonSerializer.Serialize(new
        {
            eventId = evt.Id,
            personId = evt.PersonId?.ToString(),
            personName = evt.PersonName,
            confidence = evt.Confidence,
            timestamp = evt.CapturedAt.ToString("O"),
            direction = evt.Direction.ToString().ToLower(),
            status = evt.Status.ToString(),
            faceImageUrl = evt.FaceImagePath is not null ? $"/api/events/{evt.Id}/image" : null,
            faceImageBase64 = evt.FaceImagePath is null ? evt.FaceImageBase64 : null,
            welcomeMessage = evt.WelcomeMessage,
            department = evt.Department,
        }, JsonOpts);
        await ctx.Response.WriteAsync($"id: {evt.CapturedAt:O}\ndata: {payload}\n\n", ct);
    }
}

internal static class ImageEndpoints
{
    private static readonly string ImageDir = Path.Combine(Directory.GetCurrentDirectory(), "EventImages");

    public static void MapImageEndpoints(this WebApplication app)
    {
        app.MapGet("/api/events/{id:guid}/image", async (Guid id, AppDbContext db, HttpContext ctx, CancellationToken ct) =>
        {
            var evt = await db.GateEvents
                .Where(e => e.Id == id)
                .Select(e => new { e.FaceImagePath, e.FaceImageBase64 })
                .OrderByDescending(_ => _.FaceImagePath != null) // Prefer file path if available
                .FirstOrDefaultAsync(ct);

            if (evt is null)
                return Results.NotFound();

            if (evt.FaceImagePath is not null)
            {
                var filePath = Path.GetFullPath(Path.Combine(ImageDir, evt.FaceImagePath));
                if (!filePath.StartsWith(ImageDir + Path.DirectorySeparatorChar, StringComparison.Ordinal))
                    return Results.NotFound();
                if (File.Exists(filePath))
                    return Results.File(filePath, "image/jpeg");
            }

            if (evt.FaceImageBase64 is not null)
            {
                try
                {
                    var bytes = Convert.FromBase64String(evt.FaceImageBase64);
                    return Results.File(bytes, "image/jpeg");
                }
                catch { }
            }

            return Results.NotFound();
        });
    }
}

public class ReviewEventDto
{
    public Guid PersonId { get; set; }
}
