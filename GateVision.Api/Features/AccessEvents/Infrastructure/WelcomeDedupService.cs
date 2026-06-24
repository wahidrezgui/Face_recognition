using System.Collections.Concurrent;

namespace GateVision.Api.Features.AccessEvents.Infrastructure;

public class WelcomeDedupService
{
    private readonly ConcurrentDictionary<WelcomeKey, DateTime> _lastPublishedAt = new();

    public bool ShouldPublish(string gateId, Guid? personId, DateTime capturedAt, TimeSpan cooldown)
    {
        if (!personId.HasValue) return true;

        var normalizedGateId = string.IsNullOrWhiteSpace(gateId) ? "default" : gateId.Trim().ToLowerInvariant();
        var key = new WelcomeKey(normalizedGateId, personId.Value);
        var now = capturedAt.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(capturedAt, DateTimeKind.Utc) : capturedAt.ToUniversalTime();

        while (true)
        {
            if (!_lastPublishedAt.TryGetValue(key, out var last))
            {
                if (_lastPublishedAt.TryAdd(key, now)) return true;
                continue;
            }

            if (now - last < cooldown) return false;

            if (_lastPublishedAt.TryUpdate(key, now, last)) return true;
        }
    }

    private readonly record struct WelcomeKey(string GateId, Guid PersonId);
}
