using System.Collections.Concurrent;
using GateVision.Api.Domain;
using GateVision.Api.Infrastructure.Db;

namespace GateVision.Api.Services;

public class BufferedTrack
{
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

    public async Task<int> FlushExpiredAsync(AppDbContext db)
    {
        var now = DateTime.UtcNow;
        var expired = _tracks
            .Where(kvp => now - kvp.Value.LastSeen > Expiry)
            .ToList();

        foreach (var (trackId, track) in expired)
        {
            if (!_tracks.TryRemove(trackId, out _)) continue;

            var gateEvent = new GateEvent
            {
                Id = Guid.NewGuid(),
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
        }

        if (expired.Count > 0)
            await db.SaveChangesAsync();

        return expired.Count;
    }

    public int ActiveTrackCount => _tracks.Count;
}
