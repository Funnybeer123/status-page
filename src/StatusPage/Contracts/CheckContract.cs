using StatusPage.Domain;

namespace StatusPage.Contracts;

/// <summary>
/// Locked v1 Status Check Builder contract. ICMP, subscribe, and connector-as-probe are out of scope.
/// Probes never emit degraded_performance; that status is operator-only.
/// Check types: http, https, tcp, tls_expiry, dns.
/// </summary>
public static class CheckContract
{
    public const int DefaultIntervalSeconds = 60;
    public const int MinIntervalSeconds = 15;
    public const int DefaultTimeoutSeconds = 10;
    public const int DefaultFailureThreshold = 3;
    public const int DefaultSuccessThreshold = 2;
    public const int DefaultTlsExpiryDays = 14;
    public static readonly int[] DefaultExpectedStatus = [200, 201, 204];

    public const string TypeHttp = "http";
    public const string TypeHttps = "https";
    public const string TypeTcp = "tcp";
    public const string TypeTlsExpiry = "tls_expiry";
    public const string TypeDns = "dns";

    public const string ResultOk = "ok";
    public const string ResultFail = "fail";

    public const string StateUp = "Up";
    public const string StateDown = "Down";
}

/// <summary>
/// Persisted check document (local JSON). Authorization headers may live here at runtime
/// under data/checks.json (gitignored). Never commit that file.
/// HTTP/HTTPS: target.url (or host/port + optional path).
/// TCP: target.host + target.port.
/// TLS expiry: https URL or host (port 443 default).
/// DNS: hostname.
/// Connectors are not check types.
/// </summary>
public sealed class CheckDocument
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string ComponentId { get; set; } = "";
    public string? ComponentName { get; set; }
    public string? GroupId { get; set; }
    public string Type { get; set; } = CheckContract.TypeHttps;
    public bool Enabled { get; set; } = true;
    public int IntervalSeconds { get; set; } = CheckContract.DefaultIntervalSeconds;
    public int TimeoutSeconds { get; set; } = CheckContract.DefaultTimeoutSeconds;
    public int FailureThreshold { get; set; } = CheckContract.DefaultFailureThreshold;
    public int SuccessThreshold { get; set; } = CheckContract.DefaultSuccessThreshold;
    public CheckTargetDocument Target { get; set; } = new();
    public HttpCheckDocument? Http { get; set; }
    public TlsCheckDocument? Tls { get; set; }
    public DnsCheckDocument? Dns { get; set; }
}

public sealed class CheckTargetDocument
{
    public string? Url { get; set; }
    public string? Host { get; set; }
    public int? Port { get; set; }
    public string? Path { get; set; }
}

public sealed class HttpCheckDocument
{
    public string Method { get; set; } = "GET";
    public List<int> ExpectedStatus { get; set; } = [.. CheckContract.DefaultExpectedStatus];
    public string? BodyContains { get; set; }
    public string? JsonPath { get; set; }
    public string? ExpectedJsonValue { get; set; }
    public Dictionary<string, string>? Headers { get; set; }
}

public sealed class TlsCheckDocument
{
    public int Days { get; set; } = CheckContract.DefaultTlsExpiryDays;
}

public sealed class DnsCheckDocument
{
    public List<string> ExpectedAddresses { get; set; } = [];
}

public sealed class CheckResultDocument
{
    public string Status { get; set; } = CheckContract.ResultFail;
    public int? HttpStatus { get; set; }
    public int LatencyMs { get; set; }
    public string? Error { get; set; }
    public DateTimeOffset CheckedAtUtc { get; set; }
}

public sealed class ComponentCheckStatusDocument
{
    public string ComponentId { get; set; } = "";
    public string Status { get; set; } = ComponentStatus.Operational.ApiValue();
    public int CheckCount { get; set; }
    public int DownCount { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
}
