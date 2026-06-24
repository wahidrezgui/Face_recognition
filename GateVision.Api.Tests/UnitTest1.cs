using GateVision.Api.Features.AccessEvents.Application;
using GateVision.Api.Features.AccessEvents.Domain;
using GateVision.Api.Features.AccessEvents.Infrastructure;

namespace GateVision.Api.Tests;

public class WelcomeDedupServiceTests
{
    private static readonly TimeSpan Cooldown = TimeSpan.FromSeconds(10);

    [Fact]
    public void Allows_First_Identified_Event()
    {
        var svc = new WelcomeDedupService();
        var capturedAt = DateTime.UtcNow;

        var allowed = svc.ShouldPublish("gate-a", Guid.NewGuid(), capturedAt, Cooldown);

        Assert.True(allowed);
    }

    [Fact]
    public void Suppresses_Repeated_Identified_Event_Within_Window()
    {
        var svc = new WelcomeDedupService();
        var personId = Guid.NewGuid();
        var capturedAt = DateTime.UtcNow;

        _ = svc.ShouldPublish("gate-a", personId, capturedAt, Cooldown);
        var allowedAgain = svc.ShouldPublish("gate-a", personId, capturedAt.AddSeconds(3), Cooldown);

        Assert.False(allowedAgain);
    }

    [Fact]
    public void Allows_After_Window_Expires()
    {
        var svc = new WelcomeDedupService();
        var personId = Guid.NewGuid();
        var capturedAt = DateTime.UtcNow;

        _ = svc.ShouldPublish("gate-a", personId, capturedAt, Cooldown);
        var allowedAfter = svc.ShouldPublish("gate-a", personId, capturedAt.AddSeconds(11), Cooldown);

        Assert.True(allowedAfter);
    }

    [Fact]
    public void Uses_Per_Call_Cooldown()
    {
        var svc = new WelcomeDedupService();
        var personId = Guid.NewGuid();
        var capturedAt = DateTime.UtcNow;

        _ = svc.ShouldPublish("gate-a", personId, capturedAt, TimeSpan.FromSeconds(2));
        var blocked = svc.ShouldPublish("gate-a", personId, capturedAt.AddSeconds(1), TimeSpan.FromSeconds(2));
        var allowed = svc.ShouldPublish("gate-a", personId, capturedAt.AddSeconds(3), TimeSpan.FromSeconds(2));

        Assert.False(blocked);
        Assert.True(allowed);
    }
}

public class EventBufferServiceTests
{
    [Fact]
    public void First_Buffer_Entry_Is_New_Best()
    {
        var buffer = new EventBufferService();
        var settings = new BufferSettings(TimeSpan.FromSeconds(2), TimeSpan.FromSeconds(3));

        var (_, isNewBest) = buffer.BufferOrUpdate(MakeTrack(trackId: 1, confidence: 0.7f), settings);

        Assert.True(isNewBest);
    }

    [Fact]
    public void Same_Track_Lower_Confidence_Is_Not_New_Best()
    {
        var buffer = new EventBufferService();
        var settings = new BufferSettings(TimeSpan.FromSeconds(2), TimeSpan.FromSeconds(3));
        var personId = Guid.NewGuid();

        buffer.BufferOrUpdate(MakeTrack(trackId: 1, confidence: 0.8f, personId), settings);
        var (_, isNewBest) = buffer.BufferOrUpdate(MakeTrack(trackId: 1, confidence: 0.7f, personId), settings);

        Assert.False(isNewBest);
    }

    [Fact]
    public void Same_Track_Higher_Confidence_Is_New_Best()
    {
        var buffer = new EventBufferService();
        var settings = new BufferSettings(TimeSpan.FromSeconds(2), TimeSpan.FromSeconds(3));
        var personId = Guid.NewGuid();

        buffer.BufferOrUpdate(MakeTrack(trackId: 1, confidence: 0.7f, personId), settings);
        var (_, isNewBest) = buffer.BufferOrUpdate(MakeTrack(trackId: 1, confidence: 0.85f, personId), settings);

        Assert.True(isNewBest);
    }

    private static BufferedTrack MakeTrack(int trackId, float confidence, Guid? personId = null) => new()
    {
        Id = Guid.NewGuid(),
        TrackId = trackId,
        GateId = "gate-a",
        PersonId = personId ?? Guid.NewGuid(),
        PersonName = "Test",
        Confidence = confidence,
        Status = EventStatus.Identified,
        CapturedAt = DateTime.UtcNow,
    };
}

public class IdentifyPersonHandlerTests
{
    [Fact]
    public async Task Rejects_Invalid_Embedding_Size()
    {
        var handler = new IdentifyPersonHandler(
            null!, null!, null!, null!, null!);

        var result = await handler.HandleAsync(new IdentifyPersonCommand
        {
            Embedding = new float[128],
            CapturedAt = DateTime.UtcNow.ToString("O"),
        }, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("512", result.Error);
    }
}
