using System.Net;
using System.Net.Sockets;
using StatusPage.Domain;

namespace StatusPage.Services;

/// <summary>
/// Internal host:port components are Entra/operator-only on the public page.
/// </summary>
public static class InternalHost
{
    public static bool IsInternalCheck(StatusCheck check)
    {
        if (!TryHost(check, out var host))
        {
            return false;
        }

        return IsInternalHost(host);
    }

    public static bool TryHost(StatusCheck check, out string host)
    {
        host = "";
        if (!string.IsNullOrWhiteSpace(check.Target.Host))
        {
            host = check.Target.Host.Trim();
            return true;
        }

        if (!string.IsNullOrWhiteSpace(check.Target.Url)
            && Uri.TryCreate(check.Target.Url, UriKind.Absolute, out var uri)
            && !string.IsNullOrWhiteSpace(uri.IdnHost))
        {
            host = uri.IdnHost;
            return true;
        }

        return false;
    }

    public static bool IsInternalHost(string host)
    {
        if (string.IsNullOrWhiteSpace(host))
        {
            return false;
        }

        var value = host.Trim().Trim('[', ']');
        if (value.Equals("localhost", StringComparison.OrdinalIgnoreCase)
            || value.EndsWith(".localhost", StringComparison.OrdinalIgnoreCase)
            || value.EndsWith(".local", StringComparison.OrdinalIgnoreCase)
            || value.EndsWith(".internal", StringComparison.OrdinalIgnoreCase)
            || value.EndsWith(".corp", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (!IPAddress.TryParse(value, out var address))
        {
            return false;
        }

        return IsPrivate(address);
    }

    public static bool IsPrivate(IPAddress address)
    {
        if (IPAddress.IsLoopback(address))
        {
            return true;
        }

        if (address.IsIPv4MappedToIPv6)
        {
            address = address.MapToIPv4();
        }

        if (address.AddressFamily == AddressFamily.InterNetwork)
        {
            var bytes = address.GetAddressBytes();
            return bytes[0] == 10
                   || bytes[0] == 127
                   || (bytes[0] == 172 && bytes[1] is >= 16 and <= 31)
                   || (bytes[0] == 192 && bytes[1] == 168)
                   || (bytes[0] == 169 && bytes[1] == 254);
        }

        if (address.AddressFamily == AddressFamily.InterNetworkV6)
        {
            var bytes = address.GetAddressBytes();
            return bytes[0] == 0xFC || bytes[0] == 0xFD
                   || (bytes[0] == 0xFE && (bytes[1] & 0xC0) == 0x80);
        }

        return false;
    }
}
