using System.Collections.Concurrent;
using GateVision.Api.Domain;
using GateVision.Api.Infrastructure.Db;

namespace GateVision.Api.Services;

public class BufferedTrack
{
    public required Guid Id { get; set; }
    public int TrackId { get; set; }
    public Guid? PersonId { get; set; }
    public string PersonName { get; set; } = "UNKNOWN";
    public float Confidence { get; set; }
    public EventStatus Status { get; set; }
    public Direction Direction { get; set; }
    public DateTime CapturedAt { get; set; }
    public string? FaceImageBase64 { get; set; }
    public string? WelcomeMessage { get; set; }
    public string? Department { get; set; }
    public DateTime LastSeen { get; set; }
}

public class EventBufferService
{
    private readonly ConcurrentDictionary<int, BufferedTrack> _tracks = new();
    private static readonly TimeSpan Expiry = TimeSpan.FromSeconds(3);

    public void BufferOrUpdate(BufferedTrack track)
    {
        _tracks.AddOrUpdate(track.TrackId,
            _ =>
            {
                track.LastSeen = DateTime.UtcNow;
                return track;
            },
            (_, existing) =>
            {
                if (track.Confidence > existing.Confidence)
                {
                    existing.PersonId = track.PersonId;
                    existing.PersonName = track.PersonName;
                    existing.Confidence = track.Confidence;
                    existing.Status = track.Status;
                    existing.FaceImageBase64 = track.FaceImageBase64;
                    existing.WelcomeMessage = track.WelcomeMessage;
                    existing.Department = track.Department;
                }
                existing.CapturedAt = track.CapturedAt;
                existing.LastSeen = DateTime.UtcNow;
                return existing;
            });
    }

    // Persist all events so they can be reviewed/approved later.
    // Unknown events skipped here would vanish from both buffer and DB,
    // making review impossible ("Event not found").
    bool ShouldPersist(BufferedTrack track) => true;

    /// <summary>Find a buffered track by event Id and flush it to the DB immediately.</summary>
    public async Task<GateEvent?> FindAndFlushAsync(AppDbContext db, Guid eventId)
    {
        var match = _tracks.Values.FirstOrDefault(t => t.Id == eventId);
        if (match is null) return null;

        // Remove and flush immediately (don't wait for expiry)
        if (!_tracks.TryRemove(match.TrackId, out _)) return null;

        if (!ShouldPersist(match)) return null;

        var gateEvent = new GateEvent
        {
            Id = match.Id,
            PersonId = match.PersonId,
            PersonName = match.PersonName,
            Confidence = match.Confidence,
            Status = match.Status,
            Direction = match.Direction,
            CapturedAt = match.CapturedAt,
            FaceImageBase64 = match.FaceImageBase64,
            WelcomeMessage = match.WelcomeMessage,
            Department = match.Department,
        };
        db.GateEvents.Add(gateEvent);
        await db.SaveChangesAsync();
        return gateEvent;
    }

    public async Task<int> FlushExpiredAsync(AppDbContext db)
    {
        var now = DateTime.UtcNow;
        var expired = _tracks
            .Where(kvp => now - kvp.Value.LastSeen > Expiry)
            .ToList();

        var persisted = 0;
        foreach (var (trackId, track) in expired)
        {
            if (!_tracks.TryRemove(trackId, out _)) continue;
            if (!ShouldPersist(track)) continue;

            var gateEvent = new GateEvent
            {
                Id = track.Id,  // Use the same ID published via SSE
                PersonId = track.PersonId,
                PersonName = track.PersonName,
                Confidence = track.Confidence,
                Status = track.Status,
                Direction = track.Direction,
                CapturedAt = track.CapturedAt,
                FaceImageBase64 = track.FaceImageBase64,
                WelcomeMessage = track.WelcomeMessage,
                Department = track.Department,
            };
            db.GateEvents.Add(gateEvent);
            persisted++;
        }

        if (persisted > 0)
            await db.SaveChangesAsync();

        return persisted;
    }

    public int ActiveTrackCount => _tracks.Count;
}
