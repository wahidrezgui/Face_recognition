using System.Collections.Concurrent;
using System.Threading.Channels;
using GateVision.Api.Features.AccessEvents.Domain;

namespace GateVision.Api.Features.AccessEvents.Infrastructure;

/// <summary>
/// Fan-out pub/sub for live SSE: each subscriber gets its own channel so desk and dashboard
/// both receive every published event (shared ChannelReader would deliver each item to only one reader).
/// </summary>
public class GateChannelRegistry
{
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<Guid, Channel<GateEvent>>> _gateSubscribers = new();
    private readonly ConcurrentDictionary<Guid, Channel<GateEvent>> _allSubscribers = new();

    public (Guid SubscriptionId, ChannelReader<GateEvent> Reader) SubscribeGate(string gateId)
    {
        var normalized = NormalizeGateId(gateId);
        var subId = Guid.NewGuid();
        var channel = CreateChannel();
        _gateSubscribers.GetOrAdd(normalized, _ => new()).TryAdd(subId, channel);
        return (subId, channel.Reader);
    }

    public (Guid SubscriptionId, ChannelReader<GateEvent> Reader) SubscribeAll()
    {
        var subId = Guid.NewGuid();
        var channel = CreateChannel();
        _allSubscribers.TryAdd(subId, channel);
        return (subId, channel.Reader);
    }

    public void UnsubscribeGate(string gateId, Guid subscriptionId)
    {
        var normalized = NormalizeGateId(gateId);
        if (!_gateSubscribers.TryGetValue(normalized, out var subs)) return;
        if (subs.TryRemove(subscriptionId, out var channel))
            channel.Writer.TryComplete();
        if (subs.IsEmpty)
            _gateSubscribers.TryRemove(normalized, out _);
    }

    public void UnsubscribeAll(Guid subscriptionId)
    {
        if (_allSubscribers.TryRemove(subscriptionId, out var channel))
            channel.Writer.TryComplete();
    }

    public void Publish(string gateId, GateEvent evt)
    {
        var normalized = NormalizeGateId(gateId);
        if (_gateSubscribers.TryGetValue(normalized, out var gateSubs))
        {
            foreach (var channel in gateSubs.Values)
                channel.Writer.TryWrite(evt);
        }

        foreach (var channel in _allSubscribers.Values)
            channel.Writer.TryWrite(evt);
    }

    public IEnumerable<string> ActiveGateIds => _gateSubscribers.Keys;

    private static Channel<GateEvent> CreateChannel() =>
        Channel.CreateBounded<GateEvent>(new BoundedChannelOptions(200)
        { FullMode = BoundedChannelFullMode.DropOldest });

    private static string NormalizeGateId(string gateId) =>
        string.IsNullOrWhiteSpace(gateId) ? "default" : gateId.Trim().ToLowerInvariant();
}
