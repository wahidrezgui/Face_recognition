using System.Threading.Channels;
using GateVision.Api.Domain;

namespace GateVision.Api.Services;

public static class GateEventChannel
{
    private static readonly Channel<GateEvent> _channel = Channel.CreateBounded<GateEvent>(new BoundedChannelOptions(200)
    {
        FullMode = BoundedChannelFullMode.DropOldest,
    });

    public static void Publish(GateEvent evt)
    {
        _channel.Writer.TryWrite(evt);
    }

    public static ChannelReader<GateEvent> Reader => _channel.Reader;
}
