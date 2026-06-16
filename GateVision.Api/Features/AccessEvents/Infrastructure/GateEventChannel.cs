using System.Collections.Concurrent;
using System.Threading.Channels;
using GateVision.Api.Shared.Kernel;
using GateVision.Api.Features.Identity.Domain;
using GateVision.Api.Features.AccessEvents.Domain;
using GateVision.Api.Features.GateOperations.Domain;

namespace GateVision.Api.Features.AccessEvents.Infrastructure;

public class GateChannelRegistry
{
    private readonly ConcurrentDictionary<string, Channel<GateEvent>> _channels = new();
    private readonly Channel<GateEvent> _all =
        Channel.CreateBounded<GateEvent>(new BoundedChannelOptions(500)
        { FullMode = BoundedChannelFullMode.DropOldest });

    public void Publish(string gateId, GateEvent evt)
    {
        GetOrCreate(gateId).Writer.TryWrite(evt);
        _all.Writer.TryWrite(evt);
    }

    public ChannelReader<GateEvent> GetReader(string gateId) =>
        GetOrCreate(gateId).Reader;

    public ChannelReader<GateEvent> GetAllReader() => _all.Reader;

    public IEnumerable<string> ActiveGateIds => _channels.Keys;

    private Channel<GateEvent> GetOrCreate(string gateId) =>
        _channels.GetOrAdd(NormalizeGateId(gateId), _ => Channel.CreateBounded<GateEvent>(
            new BoundedChannelOptions(200)
            { FullMode = BoundedChannelFullMode.DropOldest }));

    private static string NormalizeGateId(string gateId) =>
        string.IsNullOrWhiteSpace(gateId) ? "default" : gateId.Trim().ToLowerInvariant();
}
