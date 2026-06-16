using System.Collections.Concurrent;
using GateVision.Api.Shared.Kernel;
using GateVision.Api.Features.Identity.Domain;
using GateVision.Api.Features.AccessEvents.Domain;
using GateVision.Api.Features.GateOperations.Domain;

namespace GateVision.Api.Features.AccessEvents.Infrastructure;

public class WelcomeDedupService
{
    private readonly ConcurrentDictionary<WelcomeKey, DateTime> _lastPublishedAt = new();
    private readonly TimeSpan _cooldown;

    public WelcomeDedupService() : this(TimeSpan.FromSeconds(12))
    {
    }

    public WelcomeDedupService(TimeSpan cooldown)
    {
        _cooldown = cooldown;
    }

    public bool ShouldPublish(string gateId, Guid? personId, Direction direction, DateTime capturedAt)
    {
        if (!personId.HasValue) return true;

        var normalizedGateId = string.IsNullOrWhiteSpace(gateId) ? "default" : gateId.Trim().ToLowerInvariant();
        var key = new WelcomeKey(normalizedGateId, personId.Value, direction);
        var now = capturedAt.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(capturedAt, DateTimeKind.Utc) : capturedAt.ToUniversalTime();

        while (true)
        {
            if (!_lastPublishedAt.TryGetValue(key, out var last))
            {
                if (_lastPublishedAt.TryAdd(key, now)) return true;
                continue;
            }

            if (now - last < _cooldown) return false;

            if (_lastPublishedAt.TryUpdate(key, now, last)) return true;
        }
    }

    private readonly record struct WelcomeKey(string GateId, Guid PersonId, Direction Direction);
}
