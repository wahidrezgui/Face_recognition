using System.Collections.Concurrent;
using System.Threading.Channels;
using GateVision.Api.Domain;

namespace GateVision.Api.Services;

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
        _channels.GetOrAdd(gateId, _ => Channel.CreateBounded<GateEvent>(
            new BoundedChannelOptions(200)
                { FullMode = BoundedChannelFullMode.DropOldest }));
}
