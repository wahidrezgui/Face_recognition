using GateVision.Api.Features.AccessEvents.Application;
using GateVision.Api.Features.AccessEvents.Infrastructure;
using GateVision.Api.Shared.Kernel;

namespace GateVision.Api.Tests;

public class WelcomeDedupServiceTests
{
    [Fact]
    public void Allows_First_Identified_Event()
    {
        var svc = new WelcomeDedupService(TimeSpan.FromSeconds(10));
        var capturedAt = DateTime.UtcNow;

        var allowed = svc.ShouldPublish("gate-a", Guid.NewGuid(), capturedAt);

        Assert.True(allowed);
    }

    [Fact]
    public void Suppresses_Repeated_Identified_Event_Within_Window()
    {
        var svc = new WelcomeDedupService(TimeSpan.FromSeconds(10));
        var personId = Guid.NewGuid();
        var capturedAt = DateTime.UtcNow;

        _ = svc.ShouldPublish("gate-a", personId, capturedAt);
        var allowedAgain = svc.ShouldPublish("gate-a", personId, capturedAt.AddSeconds(3));

        Assert.False(allowedAgain);
    }

    [Fact]
    public void Allows_After_Window_Expires()
    {
        var svc = new WelcomeDedupService(TimeSpan.FromSeconds(10));
        var personId = Guid.NewGuid();
        var capturedAt = DateTime.UtcNow;

        _ = svc.ShouldPublish("gate-a", personId, capturedAt);
        var allowedAfter = svc.ShouldPublish("gate-a", personId, capturedAt.AddSeconds(11));

        Assert.True(allowedAfter);
    }
}

public class IdentifyPersonHandlerTests
{
    [Fact]
    public async Task Rejects_Invalid_Embedding_Size()
    {
        var handler = new IdentifyPersonHandler(
            null!, null!, null!, null!, null!, null!, null!);

        var result = await handler.HandleAsync(new IdentifyPersonCommand
        {
            Embedding = new float[128],
            CapturedAt = DateTime.UtcNow.ToString("O"),
        }, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("512", result.Error);
    }
}
