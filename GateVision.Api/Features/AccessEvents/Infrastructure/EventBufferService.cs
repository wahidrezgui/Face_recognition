using System.Collections.Concurrent;
using GateVision.Api.Features.AccessEvents.Domain;
using GateVision.Api.Features.GateOperations.Domain;
using GateVision.Api.Features.Identity.Domain;
using GateVision.Api.Shared.Infrastructure.Persistence;
using GateVision.Api.Shared.Kernel;
using Microsoft.EntityFrameworkCore;

namespace GateVision.Api.Features.AccessEvents.Infrastructure;

public class BufferedTrack
{
    public required Guid Id { get; set; }
    public int TrackId { get; set; }
    public string GateId { get; set; } = "default";
    public Guid? PersonId { get; set; }
    public string PersonName { get; set; } = "UNKNOWN";
    public float Confidence { get; set; }
    public EventStatus Status { get; set; }
    public DateTime CapturedAt { get; set; }
    public string? FaceImageBase64 { get; set; }
    public string? WelcomeMessage { get; set; }
    public string? Department { get; set; }
    public string? Emotion { get; set; }
    public int? Age { get; set; }
    public string? Gender { get; set; }
    public DateTime LastSeen { get; set; }
    public bool IsTrainingEvent { get; set; }
    public float AutoValidateThreshold { get; set; } = 0.85f;
    public TimeSpan TrackExpiry { get; set; } = TimeSpan.FromSeconds(3);
}

public readonly record struct BufferSettings(TimeSpan PersonDedup, TimeSpan TrackExpiry);

/// <summary>Carries the flushed entity — exactly one of GateEvent or TrainingEvent is non-null.</summary>
public record FlushResult(GateEvent? GateEvent, TrainingEvent? TrainingEvent);

public readonly record struct TrackKey(string GateId, int TrackId);
internal readonly record struct PersonKey(string GateId, Guid PersonId);

public class EventBufferService
{
    private readonly ConcurrentDictionary<TrackKey, BufferedTrack> _tracks = new();
    private readonly ConcurrentDictionary<PersonKey, TrackKey> _personToTrack = new();
    private readonly ConcurrentDictionary<Guid, TrackKey> _idToKey = new();

    public (Guid EventId, bool IsNewBest) BufferOrUpdate(BufferedTrack track, BufferSettings settings)
    {
        track.TrackExpiry = settings.TrackExpiry;
        var key = new TrackKey(track.GateId, track.TrackId);

        if (track.PersonId.HasValue)
        {
            var personKey = new PersonKey(track.GateId, track.PersonId.Value);
            if (_personToTrack.TryGetValue(personKey, out var existingKey)
                && existingKey != key
                && _tracks.TryGetValue(existingKey, out var existingPersonTrack)
                && DateTime.UtcNow - existingPersonTrack.LastSeen <= settings.PersonDedup)
            {
                key = existingKey;
                track.TrackId = existingPersonTrack.TrackId;
            }
        }

        bool isNewBest = false;
        var result = _tracks.AddOrUpdate(key,
            _ =>
            {
                track.LastSeen = DateTime.UtcNow;
                isNewBest = true;
                if (track.PersonId.HasValue)
                    _personToTrack[new PersonKey(track.GateId, track.PersonId.Value)] = key;
                return track;
            },
            (_, existing) =>
            {
                track.Id = existing.Id;
                track.TrackExpiry = existing.TrackExpiry;
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
                if (track.PersonId.HasValue)
                    _personToTrack[new PersonKey(track.GateId, track.PersonId.Value)] = key;
                return existing;
            });
        _idToKey[result.Id] = key;
        return (result.Id, isNewBest);
    }

    public async Task<FlushResult?> FindAndFlushAsync(AppDbContext db, Guid eventId)
    {
        if (!_idToKey.TryRemove(eventId, out var key)) return null;
        if (!_tracks.TryGetValue(key, out var match)) return null;
        if (!_tracks.TryRemove(key, out _)) return null;
        if (match.PersonId.HasValue)
            _personToTrack.TryRemove(new KeyValuePair<PersonKey, TrackKey>(new PersonKey(match.GateId, match.PersonId.Value), key));

        if (match.IsTrainingEvent)
        {
            var trainingEvt = TrainingEvent.Reconstitute(
                match.Id, match.GateId, match.PersonId, match.Confidence,
                match.Status, match.CapturedAt,
                match.FaceImageBase64, match.Emotion, match.Age, match.Gender);
            db.TrainingEvents.Add(trainingEvt);
            await db.SaveChangesAsync();
            return new FlushResult(null, trainingEvt);
        }
        else
        {
            var gateEvent = GateEvent.Reconstitute(
                match.Id, match.GateId, match.PersonId, match.Confidence,
                match.Status, match.CapturedAt,
                match.FaceImageBase64, match.Emotion, match.Age, match.Gender);
            gateEvent.PersonName = match.PersonName;
            gateEvent.WelcomeMessage = match.WelcomeMessage;
            gateEvent.Department = match.Department;

            var autoValidate = match.PersonId.HasValue && match.Confidence > match.AutoValidateThreshold;
            if (autoValidate)
            {
                db.ValidatedEvents.Add(ValidatedEvent.FromBuffer(
                    match.Id, match.GateId, match.PersonId, match.Confidence,
                    match.CapturedAt,
                    match.FaceImageBase64, match.Emotion, match.Age, match.Gender,
                    ValidationSource.Auto));
            }
            else
            {
                db.GateEvents.Add(gateEvent);
            }

            await db.SaveChangesAsync();
            return new FlushResult(gateEvent, null);
        }
    }

    public async Task<int> FlushExpiredAsync(AppDbContext db)
    {
        var now = DateTime.UtcNow;
        var expired = _tracks
            .Where(kvp => now - kvp.Value.LastSeen > kvp.Value.TrackExpiry)
            .ToList();

        var persisted = 0;
        foreach (var (key, track) in expired)
        {
            if (!_tracks.TryRemove(key, out _)) continue;
            _idToKey.TryRemove(track.Id, out _);
            if (track.PersonId.HasValue)
                _personToTrack.TryRemove(new KeyValuePair<PersonKey, TrackKey>(new PersonKey(track.GateId, track.PersonId.Value), key));

            if (track.IsTrainingEvent)
            {
                db.TrainingEvents.Add(TrainingEvent.Reconstitute(
                    track.Id, track.GateId, track.PersonId, track.Confidence,
                    track.Status, track.CapturedAt,
                    track.FaceImageBase64, track.Emotion, track.Age, track.Gender));
            }
            else
            {
                var gateEvent = GateEvent.Reconstitute(
                    track.Id, track.GateId, track.PersonId, track.Confidence,
                    track.Status, track.CapturedAt,
                    track.FaceImageBase64, track.Emotion, track.Age, track.Gender);
                gateEvent.PersonName = track.PersonName;
                gateEvent.WelcomeMessage = track.WelcomeMessage;
                gateEvent.Department = track.Department;

                var autoValidate = track.PersonId.HasValue && track.Confidence > track.AutoValidateThreshold;
                if (autoValidate)
                {
                    db.ValidatedEvents.Add(ValidatedEvent.FromBuffer(
                        track.Id, track.GateId, track.PersonId, track.Confidence,
                        track.CapturedAt,
                        track.FaceImageBase64, track.Emotion, track.Age, track.Gender,
                        ValidationSource.Auto));
                }
                else
                {
                    db.GateEvents.Add(gateEvent);
                }
            }
            persisted++;
        }

        if (persisted > 0)
            await db.SaveChangesAsync();

        return persisted;
    }

    public int ActiveTrackCount => _tracks.Count;
}
