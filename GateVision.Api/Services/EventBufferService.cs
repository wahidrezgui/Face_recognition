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
    public string? Emotion { get; set; }
    public int? Age { get; set; }
    public string? Gender { get; set; }
    public DateTime LastSeen { get; set; }
    public bool IsTrainingEvent { get; set; }
}

/// <summary>Carries the flushed entity — exactly one of GateEvent or TrainingEvent is non-null.</summary>
public record FlushResult(GateEvent? GateEvent, TrainingEvent? TrainingEvent);

public class EventBufferService
{
    private readonly ConcurrentDictionary<int, BufferedTrack> _tracks = new();
    private static readonly TimeSpan Expiry = TimeSpan.FromSeconds(3);

    /// <summary>
    /// Adds or updates a track in the buffer.
    /// Returns the stable event Guid and whether this frame is the new confidence best.
    /// Callers should publish to SSE only when IsNewBest is true.
    /// </summary>
    public (Guid EventId, bool IsNewBest) BufferOrUpdate(BufferedTrack track)
    {
        bool isNewBest = false;
        var result = _tracks.AddOrUpdate(track.TrackId,
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
                if (track.Confidence > existing.Confidence)
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

        if (!_tracks.TryRemove(match.TrackId, out _)) return null;

        if (match.IsTrainingEvent)
        {
            var trainingEvt = new TrainingEvent
            {
                Id = match.Id,
                PersonId = match.PersonId,
                Confidence = match.Confidence,
                Status = match.Status,
                Direction = match.Direction,
                CapturedAt = match.CapturedAt,
                FaceImageBase64 = match.FaceImageBase64,
                Emotion = match.Emotion,
                Age = match.Age,
                Gender = match.Gender,
            };
            db.TrainingEvents.Add(trainingEvt);
            await db.SaveChangesAsync();
            return new FlushResult(null, trainingEvt);
        }
        else
        {
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
                Emotion = match.Emotion,
                Age = match.Age,
                Gender = match.Gender,
            };
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
        foreach (var (trackId, track) in expired)
        {
            if (!_tracks.TryRemove(trackId, out _)) continue;

            if (track.IsTrainingEvent)
            {
                db.TrainingEvents.Add(new TrainingEvent
                {
                    Id = track.Id,
                    PersonId = track.PersonId,
                    Confidence = track.Confidence,
                    Status = track.Status,
                    Direction = track.Direction,
                    CapturedAt = track.CapturedAt,
                    FaceImageBase64 = track.FaceImageBase64,
                    Emotion = track.Emotion,
                    Age = track.Age,
                    Gender = track.Gender,
                });
            }
            else
            {
                db.GateEvents.Add(new GateEvent
                {
                    Id = track.Id,
                    PersonId = track.PersonId,
                    PersonName = track.PersonName,
                    Confidence = track.Confidence,
                    Status = track.Status,
                    Direction = track.Direction,
                    CapturedAt = track.CapturedAt,
                    FaceImageBase64 = track.FaceImageBase64,
                    WelcomeMessage = track.WelcomeMessage,
                    Department = track.Department,
                    Emotion = track.Emotion,
                    Age = track.Age,
                    Gender = track.Gender,
                });
            }
            persisted++;
        }

        if (persisted > 0)
            await db.SaveChangesAsync();

        return persisted;
    }

    public int ActiveTrackCount => _tracks.Count;
}
