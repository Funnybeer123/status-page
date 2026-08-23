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
            error = "Target is required (URL or host:port).";
            return false;
        }

        var value = rawTarget.Trim();
        if (value.Contains(',') || value.Contains(' ') || value.Contains('\n'))
        {
            error = "Target must be a single host or URL. Lists and ranges are not allowed.";
            return false;
        }

        CheckType? explicitType = null;
        if (!string.IsNullOrWhiteSpace(rawType))
        {
            if (!DomainEnums.TryParseCheckType(rawType, out var parsedType))
            {
                error = "Type must be http, https, or tcp.";
                return false;
            }

            explicitType = parsedType;
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

            var type = uri.Scheme == Uri.UriSchemeHttps ? CheckType.Https : CheckType.Http;
            if (explicitType is { } requested && requested != type)
            {
                error = $"Type '{requested.ApiValue()}' does not match target scheme '{uri.Scheme}'.";
                return false;
            }

            var httpPort = uri.IsDefaultPort ? (type == CheckType.Https ? 443 : 80) : uri.Port;
            target = new ResolvedCheckTarget(type, uri.IdnHost, httpPort, uri);
            return true;
        }

        if (value.Contains("://", StringComparison.Ordinal))
        {
            error = "Only http, https, or host:port TCP targets are allowed.";
            return false;
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

    private static bool IsPlausibleHost(string host)
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
