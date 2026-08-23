using System.Net.NetworkInformation;

namespace StatusPage.Services;

public sealed record IcmpSendResult(IPStatus Status, long RoundtripMilliseconds);

/// <summary>
/// Sends one ICMP echo to a single explicit host. Implementations must not
/// expand CIDR, ranges, or otherwise discover additional hosts.
/// </summary>
public interface IIcmpSender
{
    Task<IcmpSendResult> SendAsync(string host, int timeoutMilliseconds, CancellationToken cancellationToken);
}

public sealed class SystemIcmpSender : IIcmpSender
{
    public async Task<IcmpSendResult> SendAsync(
        string host,
        int timeoutMilliseconds,
        CancellationToken cancellationToken)
    {
        using var ping = new Ping();
        var reply = await ping.SendPingAsync(host, timeoutMilliseconds).WaitAsync(cancellationToken);
        return new IcmpSendResult(reply.Status, reply.RoundtripTime);
    }
}
