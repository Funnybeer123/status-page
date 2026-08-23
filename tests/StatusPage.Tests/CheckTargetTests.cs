using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Tests;

public class CheckTargetTests
{
    [Theory]
    [InlineData("https://example.com", "https", CheckType.Https)]
    [InlineData("http://127.0.0.1:5080/health", "http", CheckType.Http)]
    [InlineData("127.0.0.1:9", "tcp", CheckType.Tcp)]
    [InlineData("db.internal:5432", null, CheckType.Tcp)]
    [InlineData("localhost", "dns", CheckType.Dns)]
    [InlineData("https://example.com", "tls_expiry", CheckType.TlsExpiry)]
    public void Parses_supported_targets(string target, string? type, CheckType expected)
    {
        Assert.True(CheckTarget.TryParse(target, type, out var resolved, out var error), error);
        Assert.Equal(expected, resolved.Type);
    }

    [Theory]
    [InlineData("https://example.com,https://evil.example")]
    [InlineData("10.0.0.0/24")]
    [InlineData("ftp://example.com")]
    [InlineData("not-a-target")]
    [InlineData("host-without-port")]
    [InlineData("icmp://1.1.1.1")]
    public void Rejects_scans_and_invalid_targets(string target)
    {
        Assert.False(CheckTarget.TryParse(target, null, out _, out var error));
        Assert.False(string.IsNullOrWhiteSpace(error));
    }

    [Theory]
    [InlineData("connector")]
    [InlineData("icmp")]
    public void Rejects_connector_and_icmp_types(string type)
    {
        Assert.False(CheckTarget.TryParse("https://example.com", type, out _, out var error));
        Assert.Contains("not probes", error, StringComparison.OrdinalIgnoreCase);
    }
}
