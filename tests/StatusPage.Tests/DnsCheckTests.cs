using System.Net;
using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Tests;

public class DnsCheckTests
{
    [Fact]
    public void Evaluate_fails_when_no_addresses()
    {
        var result = CheckRunner.EvaluateDns([], DateTimeOffset.UtcNow);
        Assert.Equal(CheckResultStatus.Fail, result.Status);
        Assert.Contains("no addresses", result.Error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Evaluate_passes_when_addresses_exist()
    {
        var result = CheckRunner.EvaluateDns([IPAddress.Loopback], DateTimeOffset.UtcNow);
        Assert.Equal(CheckResultStatus.Ok, result.Status);
    }

    [Fact]
    public void Parses_dns_hostname()
    {
        Assert.True(CheckTarget.TryParse("localhost", "dns", out var target, out var error), error);
        Assert.Equal(CheckType.Dns, target.Type);
        Assert.Equal("localhost", target.Host);
    }
}
