using GateVision.Api.Features.AccessEvents.Infrastructure;
using GateVision.Api.Features.Identity.Domain;
using GateVision.Api.Features.Identity.Infrastructure;
using GateVision.Api.Shared.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GateVision.Api.Shared.Infrastructure.HostedServices;

public class EventBufferFlushService(
    IServiceProvider services,
    ILogger<EventBufferFlushService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var timer = new PeriodicTimer(TimeSpan.FromSeconds(1));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                using var scope = services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var buffer = scope.ServiceProvider.GetRequiredService<EventBufferService>();
                var flushed = await buffer.FlushExpiredAsync(db);
                if (flushed > 0)
                    logger.LogInformation("Flushed {Count} expired tracks to gate_events", flushed);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Track flush error");
            }
        }
    }
}

public class GateEventCleanupService(
    IServiceProvider services,
    ILogger<GateEventCleanupService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var timer = new PeriodicTimer(TimeSpan.FromHours(1));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                using var scope = services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var cutoff = DateTime.UtcNow.AddDays(-90);
                var deleted = await db.GateEvents
                    .Where(e => e.CapturedAt < cutoff)
                    .ExecuteDeleteAsync(stoppingToken);
                if (deleted > 0)
                    logger.LogInformation("Cleaned up {Count} gate_events older than 90 days", deleted);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Event cleanup error");
            }
        }
    }
}

public class QdrantInitService(
    IServiceProvider services,
    ILogger<QdrantInitService> logger) : IHostedService
{
    public Task StartAsync(CancellationToken cancellationToken)
    {
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = services.CreateScope();
                var store = scope.ServiceProvider.GetRequiredService<IVectorStore>();
                await store.EnsureCollectionAsync();
                logger.LogInformation("Qdrant collection ready");
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Qdrant collection init failed — will retry on first use");
            }
        }, cancellationToken);
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
