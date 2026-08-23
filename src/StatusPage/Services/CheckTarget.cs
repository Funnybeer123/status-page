using System.Net;
using System.Net.Sockets;
using StatusPage.Domain;

namespace StatusPage.Services;

public sealed record ResolvedCheckTarget(CheckType Type, string Host, int Port, Uri? Uri);

public static class CheckTarget
{
    public static bool TryParse(string? rawTarget, string? rawType, out ResolvedCheckTarget target, out string error)
    {
        target = default!;
        error = "";

        if (string.IsNullOrWhiteSpace(rawTarget))
        {
            error = "Target is required (URL, hostname, or host:port).";
            return false;
        }

        var value = rawTarget.Trim();
        if (value.Contains(',') || value.Contains(' ') || value.Contains('\n'))
        {
            error = "Target must be a single host or URL. Lists and ranges are not allowed.";
            return false;
        }

        if (IsCidrOrIpRange(value))
        {
            error = "Target must be a single host or URL. CIDR and ranges are not allowed.";
            return false;
        }

        CheckType? explicitType = null;
        if (!string.IsNullOrWhiteSpace(rawType))
        {
            if (rawType.Trim().Equals("ping", StringComparison.OrdinalIgnoreCase)
                || rawType.Trim().Equals("connector", StringComparison.OrdinalIgnoreCase))
            {
                error = "Type must be http, https, tcp, tls_expiry, dns, or icmp. Connectors are not probes.";
                return false;
            }

            if (!DomainEnums.TryParseCheckType(rawType, out var parsedType))
            {
                error = "Type must be http, https, tcp, tls_expiry, dns, or icmp.";
                return false;
            }

            explicitType = parsedType;
        }

        if (explicitType == CheckType.Icmp)
        {
            return TryParseIcmpHost(value, out target, out error);
        }

        if (value.Contains("://", StringComparison.Ordinal)
            && Uri.TryCreate(value, UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
        {
            if (string.IsNullOrWhiteSpace(uri.Host) || uri.IsFile || uri.IsUnc)
            {
                error = "HTTP(S) target must include a host.";
                return false;
            }

            if (explicitType == CheckType.Dns)
            {
                target = new ResolvedCheckTarget(CheckType.Dns, uri.IdnHost, 0, uri);
                return true;
            }

            if (explicitType == CheckType.TlsExpiry)
            {
                if (uri.Scheme != Uri.UriSchemeHttps)
                {
                    error = "tls_expiry checks require an https:// URL or host:443.";
                    return false;
                }

                var tlsPort = uri.IsDefaultPort ? 443 : uri.Port;
                target = new ResolvedCheckTarget(CheckType.TlsExpiry, uri.IdnHost, tlsPort, uri);
                return true;
            }

            var type = uri.Scheme == Uri.UriSchemeHttps ? CheckType.Https : CheckType.Http;
            if (explicitType is { } requested && requested is not (CheckType.Http or CheckType.Https))
            {
                error = $"Type '{requested.ApiValue()}' does not match target scheme '{uri.Scheme}'.";
                return false;
            }

            if (explicitType is { } httpRequested && httpRequested != type)
            {
                error = $"Type '{httpRequested.ApiValue()}' does not match target scheme '{uri.Scheme}'.";
                return false;
            }

            var httpPort = uri.IsDefaultPort ? (type == CheckType.Https ? 443 : 80) : uri.Port;
            target = new ResolvedCheckTarget(type, uri.IdnHost, httpPort, uri);
            return true;
        }

        if (value.Contains("://", StringComparison.Ordinal))
        {
            error = "Only http, https, host, host:port TCP, or ICMP host targets are allowed.";
            return false;
        }

        if (explicitType == CheckType.Dns)
        {
            if (TryParseHostPort(value, out var dnsHost, out _))
            {
                target = new ResolvedCheckTarget(CheckType.Dns, dnsHost, 0, null);
                return true;
            }

            if (!IsPlausibleHost(value))
            {
                error = "DNS target must be a hostname.";
                return false;
            }

            target = new ResolvedCheckTarget(CheckType.Dns, value, 0, null);
            return true;
        }

        if (explicitType == CheckType.TlsExpiry)
        {
            if (TryParseHostPort(value, out var tlsHost, out var tlsPort))
            {
                target = new ResolvedCheckTarget(CheckType.TlsExpiry, tlsHost, tlsPort, null);
                return true;
            }

            if (!IsPlausibleHost(value))
            {
                error = "tls_expiry target must be an https URL or host[:port].";
                return false;
            }

            target = new ResolvedCheckTarget(CheckType.TlsExpiry, value, 443, null);
            return true;
        }

        if (explicitType is CheckType.Http or CheckType.Https)
        {
            error = "HTTP(S) checks require an absolute http:// or https:// URL.";
            return false;
        }

        if (!TryParseHostPort(value, out var host, out var port))
        {
            error = "TCP target must be host:port (for example 127.0.0.1:8080 or db.internal:5432).";
            return false;
        }

        target = new ResolvedCheckTarget(CheckType.Tcp, host, port, null);
        return true;
    }

    public static bool IsCidrOrIpRange(string value)
    {
        var trimmed = value.Trim();
        var slash = trimmed.IndexOf('/');
        if (slash > 0 && slash < trimmed.Length - 1)
        {
            var network = trimmed[..slash].Trim().Trim('[', ']');
            var prefix = trimmed[(slash + 1)..].Trim();
            if (IPAddress.TryParse(network, out _)
                && int.TryParse(prefix, out var bits)
                && bits is >= 0 and <= 128)
            {
                return true;
            }
        }

        var hyphen = trimmed.IndexOf('-');
        if (hyphen > 0 && hyphen < trimmed.Length - 1)
        {
            var left = trimmed[..hyphen].Trim().Trim('[', ']');
            var right = trimmed[(hyphen + 1)..].Trim().Trim('[', ']');
            if (IPAddress.TryParse(left, out _)
                && (IPAddress.TryParse(right, out _) || int.TryParse(right, out _)))
            {
                return true;
            }
        }

        return false;
    }

    private static bool TryParseIcmpHost(string value, out ResolvedCheckTarget target, out string error)
    {
        target = default!;
        error = "";

        if (value.Contains("://", StringComparison.Ordinal) || value.Contains('*') || value.Contains('?'))
        {
            error = "ICMP target must be a single explicit host. URLs, wildcards, CIDR, and ranges are not allowed.";
            return false;
        }

        if (IsCidrOrIpRange(value))
        {
            error = "ICMP target must be a single explicit host. CIDR and ranges are not allowed.";
            return false;
        }

        if (TryParseHostPort(value, out _, out _))
        {
            error = "ICMP target must be a single host (no port, CIDR, or range).";
            return false;
        }

        var host = value.Trim().Trim('[', ']');
        if (!IsPlausibleHost(host) || !IsExplicitUnicastHost(host))
        {
            error = "ICMP target must be a single hostname or unicast IP.";
            return false;
        }

        target = new ResolvedCheckTarget(CheckType.Icmp, host, 0, null);
        return true;
    }

    private static bool IsExplicitUnicastHost(string host)
    {
        if (!IPAddress.TryParse(host, out var address))
        {
            return true;
        }

        if (address.Equals(IPAddress.Any)
            || address.Equals(IPAddress.IPv6Any)
            || address.Equals(IPAddress.Broadcast))
        {
            return false;
        }

        if (address.AddressFamily == AddressFamily.InterNetwork)
        {
            var first = address.GetAddressBytes()[0];
            return first is < 224 or > 239;
        }

        return address.AddressFamily != AddressFamily.InterNetworkV6
               || (address.GetAddressBytes()[0] != 0xFF);
    }

    public static bool TryParseHostPort(string value, out string host, out int port)
    {
        host = "";
        port = 0;

        if (value.StartsWith('[') && value.Contains(']'))
        {
            var end = value.IndexOf(']');
            host = value[1..end];
            if (end + 2 >= value.Length || value[end + 1] != ':')
            {
                return false;
            }

            return int.TryParse(value[(end + 2)..], out port) && port is >= 1 and <= 65535 && host.Length > 0;
        }

        var lastColon = value.LastIndexOf(':');
        if (lastColon <= 0 || lastColon == value.Length - 1)
        {
            return false;
        }

        host = value[..lastColon];
        if (host.Count(c => c == ':') > 0 && !IPAddress.TryParse(host, out _))
        {
            return false;
        }

        return int.TryParse(value[(lastColon + 1)..], out port)
               && port is >= 1 and <= 65535
               && !string.IsNullOrWhiteSpace(host)
               && IsPlausibleHost(host);
    }

    public static bool HasTargetFields(CheckTargetSpec? target) =>
        target is not null
        && (!string.IsNullOrWhiteSpace(target.Url)
            || !string.IsNullOrWhiteSpace(target.Host)
            || target.Port is > 0
            || !string.IsNullOrWhiteSpace(target.Path));

    /// <summary>
    /// True when <paramref name="requested"/> does not name a different host
    /// (or port) than the stored probe. Empty requested fields are ignored.
    /// </summary>
    public static bool SameProbeHost(CheckTargetSpec stored, CheckTargetSpec requested)
    {
        var storedHost = HostOf(stored);
        var requestedHost = HostOf(requested);
        if (!string.IsNullOrWhiteSpace(requestedHost)
            && !string.Equals(storedHost, requestedHost, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (requested.Port is int requestedPort)
        {
            var storedPort = stored.Port ?? PortOf(stored.Url);
            if (storedPort is int port && port != requestedPort)
            {
                return false;
            }
        }

        return true;
    }

    public static string? HostOf(CheckTargetSpec target)
    {
        if (!string.IsNullOrWhiteSpace(target.Host))
        {
            return target.Host.Trim();
        }

        if (!string.IsNullOrWhiteSpace(target.Url) && Uri.TryCreate(target.Url.Trim(), UriKind.Absolute, out var uri))
        {
            return uri.IdnHost;
        }

        return null;
    }

    private static int? PortOf(string? url)
    {
        if (string.IsNullOrWhiteSpace(url) || !Uri.TryCreate(url.Trim(), UriKind.Absolute, out var uri))
        {
            return null;
        }

        if (uri.IsDefaultPort)
        {
            return uri.Scheme == Uri.UriSchemeHttps ? 443 : uri.Scheme == Uri.UriSchemeHttp ? 80 : null;
        }

        return uri.Port;
    }

    public static bool IsPlausibleHost(string host)
    {
        if (IPAddress.TryParse(host, out var address))
        {
            return address.AddressFamily is AddressFamily.InterNetwork or AddressFamily.InterNetworkV6;
        }

        return (host.All(c => char.IsLetterOrDigit(c) || c is '.' or '-' or '_') && host.Contains('.'))
               || host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
               || host.All(char.IsLetterOrDigit);
    }
}
