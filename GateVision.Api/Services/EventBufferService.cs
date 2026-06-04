using System.Collections.Concurrent;
using GateVision.Api.Domain;
using GateVision.Api.Infrastructure.Db;

namespace GateVision.Api.Services;

public class BufferedTrack
{
    public required Guid Id { get; set; }
    public int TrackId { get; set; }
    public string GateId { get; set; } = "default";
    public Guid? PersonId { get; set; }
    public string PersonName { get; set; } = "UNKNOWN";
    public float Confidence { get; set; }
    public EventStatus Status { get; set; }
    public Direction Direction { get; set; }
    public DateTime CapturedAt { get; set; }
    public string? FaceImageBase64 { get; set; }
    public string? WelcomeMessage { get; set; }
    public string? Department { get; set; }
    public string? Emotion { get; set; }
    public int? Age { get; set; }
    public string? Gender { get; set; }
    public DateTime LastSeen { get; set; }
    public bool IsTrainingEvent { get; set; }
}

/// <summary>Carries the flushed entity — exactly one of GateEvent or TrainingEvent is non-null.</summary>
public record FlushResult(GateEvent? GateEvent, TrainingEvent? TrainingEvent);

public readonly record struct TrackKey(string GateId, int TrackId);

public class EventBufferService
{
    private readonly ConcurrentDictionary<TrackKey, BufferedTrack> _tracks = new();
    private static readonly TimeSpan Expiry = TimeSpan.FromSeconds(3);

    /// <summary>
    /// Adds or updates a track in the buffer.
    /// Returns the stable event Guid and whether this frame is the new confidence best.
    /// Callers should publish to SSE only when IsNewBest is true.
    /// </summary>
    public (Guid EventId, bool IsNewBest) BufferOrUpdate(BufferedTrack track)
    {
        var key = new TrackKey(track.GateId, track.TrackId);
        bool isNewBest = false;
        var result = _tracks.AddOrUpdate(key,
            _ =>
            {
                track.LastSeen = DateTime.UtcNow;
                isNewBest = true;
                return track;
            },
            (_, existing) =>
            {
                // Preserve the original ID so the SSE event ID never changes for this track.
                track.Id = existing.Id;
                var statusUpgraded = track.Status == EventStatus.Identified &&
                    existing.Status != EventStatus.Identified;
                if (track.Confidence > existing.Confidence || statusUpgraded)
                {
                    isNewBest = true;
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
        return (result.Id, isNewBest);
    }

    /// <summary>Find a buffered track by event Id and flush it to the DB immediately.</summary>
    public async Task<FlushResult?> FindAndFlushAsync(AppDbContext db, Guid eventId)
    {
        var match = _tracks.Values.FirstOrDefault(t => t.Id == eventId);
        if (match is null) return null;

        var key = new TrackKey(match.GateId, match.TrackId);
        if (!_tracks.TryRemove(key, out _)) return null;

        if (match.IsTrainingEvent)
        {
            var trainingEvt = TrainingEvent.Reconstitute(
                match.Id, match.GateId, match.PersonId, match.Confidence,
                match.Status, match.Direction, match.CapturedAt,
                match.FaceImageBase64, match.Emotion, match.Age, match.Gender);
            db.TrainingEvents.Add(trainingEvt);
            await db.SaveChangesAsync();
            return new FlushResult(null, trainingEvt);
        }
        else
        {
            var gateEvent = GateEvent.Reconstitute(
                match.Id, match.GateId, match.PersonId, match.Confidence,
                match.Status, match.Direction, match.CapturedAt,
                match.FaceImageBase64, match.Emotion, match.Age, match.Gender);
            gateEvent.PersonName = match.PersonName;
            gateEvent.WelcomeMessage = match.WelcomeMessage;
            gateEvent.Department = match.Department;
            db.GateEvents.Add(gateEvent);
            await db.SaveChangesAsync();
            return new FlushResult(gateEvent, null);
        }
    }

    public async Task<int> FlushExpiredAsync(AppDbContext db)
    {
        var now = DateTime.UtcNow;
        var expired = _tracks
            .Where(kvp => now - kvp.Value.LastSeen > Expiry)
            .ToList();

        var persisted = 0;
        foreach (var (key, track) in expired)
        {
            if (!_tracks.TryRemove(key, out _)) continue;

            if (track.IsTrainingEvent)
            {
                db.TrainingEvents.Add(TrainingEvent.Reconstitute(
                    track.Id, track.GateId, track.PersonId, track.Confidence,
                    track.Status, track.Direction, track.CapturedAt,
                    track.FaceImageBase64, track.Emotion, track.Age, track.Gender));
            }
            else
            {
                var gateEvent = GateEvent.Reconstitute(
                    track.Id, track.GateId, track.PersonId, track.Confidence,
                    track.Status, track.Direction, track.CapturedAt,
                    track.FaceImageBase64, track.Emotion, track.Age, track.Gender);
                gateEvent.PersonName = track.PersonName;
                gateEvent.WelcomeMessage = track.WelcomeMessage;
                gateEvent.Department = track.Department;
                db.GateEvents.Add(gateEvent);
            }
            persisted++;
        }

        if (persisted > 0)
            await db.SaveChangesAsync();

        return persisted;
    }

    public int ActiveTrackCount => _tracks.Count;
}
