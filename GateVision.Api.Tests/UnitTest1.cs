using GateVision.Api.Features.AccessEvents.Application;
using GateVision.Api.Features.AccessEvents.Domain;
using GateVision.Api.Features.AccessEvents.Infrastructure;
using GateVision.Api.Features.GateOperations.Domain;
using GateVision.Api.Shared.Kernel;
using Microsoft.Extensions.Logging.Abstractions;

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
    private static EventBufferService CreateBuffer() =>
        new(new GateChannelRegistry());

    [Fact]
    public void First_Buffer_Entry_Is_New_Best()
    {
        var buffer = CreateBuffer();
        var settings = new BufferSettings(TimeSpan.FromSeconds(2), TimeSpan.FromSeconds(3));

        var (_, isNewBest) = buffer.BufferOrUpdate(MakeTrack(trackId: 1, confidence: 0.7f), settings);

        Assert.True(isNewBest);
    }

    [Fact]
    public void Same_Track_Lower_Confidence_Is_Not_New_Best()
    {
        var buffer = CreateBuffer();
        var settings = new BufferSettings(TimeSpan.FromSeconds(2), TimeSpan.FromSeconds(3));
        var personId = Guid.NewGuid();

        buffer.BufferOrUpdate(MakeTrack(trackId: 1, confidence: 0.8f, personId), settings);
        var (_, isNewBest) = buffer.BufferOrUpdate(MakeTrack(trackId: 1, confidence: 0.7f, personId), settings);

        Assert.False(isNewBest);
    }

    [Fact]
    public void Same_Track_Higher_Confidence_Is_New_Best()
    {
        var buffer = CreateBuffer();
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

public class IdentificationServiceTests
{
    private static readonly GateRecognitionSettings Settings = GateRecognitionSettings.Default;

    private static IdentificationService CreateService() =>
        new(null!, null!, null!, NullLogger<IdentificationService>.Instance);

    [Fact]
    public void IdentifyFromClient_Known_Person_Above_Threshold()
    {
        var personId = Guid.NewGuid();
        var result = CreateService().IdentifyFromClient(
            personId, "Alice", 0.92f, "Welcome back!", Settings);

        Assert.Equal(personId, result.PersonId);
        Assert.Equal("Alice", result.PersonName);
        Assert.Equal(0.92f, result.Confidence);
        Assert.Equal(EventStatus.Identified, result.Status);
        Assert.Equal("Welcome back!", result.WelcomeMessage);
    }

    [Fact]
    public void IdentifyFromClient_Known_Person_Below_Threshold()
    {
        var personId = Guid.NewGuid();
        var result = CreateService().IdentifyFromClient(
            personId, "Alice", 0.6f, null, Settings);

        Assert.Equal(personId, result.PersonId);
        Assert.Equal(EventStatus.NeedsReview, result.Status);
    }

    [Fact]
    public void IdentifyFromClient_Unknown_Skips_PersonId()
    {
        var result = CreateService().IdentifyFromClient(
            null, "UNKNOWN", 0f, "Please proceed to scan your card access", Settings);

        Assert.Null(result.PersonId);
        Assert.Equal("UNKNOWN", result.PersonName);
        Assert.Equal(EventStatus.NeedsReview, result.Status);
        Assert.Equal("Please proceed to scan your card access", result.WelcomeMessage);
    }
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

public class GateChannelRegistryTests
{
    private static GateEvent MakeEvent(string gateId) =>
        GateEvent.Reconstitute(
            Guid.NewGuid(),
            gateId,
            Guid.NewGuid(),
            0.9f,
            EventStatus.Identified,
            DateTime.UtcNow,
            null,
            null,
            null,
            null);

    [Fact]
    public async Task Publish_Fans_Out_To_All_Gate_Subscribers()
    {
        var registry = new GateChannelRegistry();
        var gateId = "3b7a6d06-f8e8-44c9-a731-7f20340e02c4";
        var (_, readerA) = registry.SubscribeGateLive(gateId);
        var (_, readerB) = registry.SubscribeGateLive(gateId);
        var evt = MakeEvent(gateId);

        registry.PublishLive(gateId, evt);

        Assert.True(readerA.TryRead(out var a));
        Assert.True(readerB.TryRead(out var b));
        Assert.Equal(evt.Id, a.Id);
        Assert.Equal(evt.Id, b.Id);
        await Task.CompletedTask;
    }

    [Fact]
    public async Task Publish_Fans_Out_To_All_Subscribers()
    {
        var registry = new GateChannelRegistry();
        var gateId = "gate-b";
        var (_, gateReader) = registry.SubscribeGateLive(gateId);
        var (_, allReader) = registry.SubscribeAllLive();
        var evt = MakeEvent(gateId);

        registry.PublishLive(gateId, evt);

        Assert.True(gateReader.TryRead(out _));
        Assert.True(allReader.TryRead(out var allEvt));
        Assert.Equal(evt.Id, allEvt.Id);
        await Task.CompletedTask;
    }

    [Fact]
    public void Unsubscribe_Stops_Delivery()
    {
        var registry = new GateChannelRegistry();
        var gateId = "gate-b";
        var (subId, reader) = registry.SubscribeGateLive(gateId);
        registry.UnsubscribeGateLive(gateId, subId);

        registry.Publish(gateId, MakeEvent(gateId));

        Assert.False(reader.TryRead(out _));
    }

    [Fact]
    public async Task Live_And_Slim_Channels_Are_Isolated()
    {
        var registry = new GateChannelRegistry();
        var gateId = "gate-c";
        var (_, liveReader) = registry.SubscribeGateLive(gateId);
        var (_, slimReader) = registry.SubscribeGateSlim(gateId);
        var liveEvt = MakeEvent(gateId);
        liveEvt.TrackId = 1;
        liveEvt.IsFinal = false;
        var slimEvt = MakeEvent(gateId);
        slimEvt.TrackId = 2;
        slimEvt.IsFinal = true;

        registry.PublishLive(gateId, liveEvt);

        Assert.True(liveReader.TryRead(out var receivedLive));
        Assert.False(slimReader.TryRead(out _));
        Assert.Equal(liveEvt.Id, receivedLive.Id);
        Assert.False(liveEvt.IsFinal);

        registry.PublishSlim(gateId, slimEvt);

        Assert.True(slimReader.TryRead(out var receivedSlim));
        Assert.False(liveReader.TryRead(out _));
        Assert.Equal(slimEvt.Id, receivedSlim.Id);
        Assert.True(receivedSlim.IsFinal);
        await Task.CompletedTask;
    }
}
