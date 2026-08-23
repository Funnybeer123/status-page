using System.Net.NetworkInformation;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using StatusPage.Api;
using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Tests;

public class IcmpCheckTests
{
    [Fact]
    public void Parses_single_explicit_host()
    {
        Assert.True(CheckTarget.TryParse("203.0.113.10", "icmp", out var target, out var error), error);
        Assert.Equal(CheckType.Icmp, target.Type);
        Assert.Equal("203.0.113.10", target.Host);
        Assert.Equal(0, target.Port);
    }

    [Theory]
    [InlineData("10.0.0.0/24")]
    [InlineData("10.0.0.1-10.0.0.10")]
    [InlineData("192.168.0.0/16")]
    [InlineData("10.0.0.1-20")]
    [InlineData("2001:db8::/32")]
    public void Rejects_cidr_and_ranges(string target)
    {
        Assert.False(CheckTarget.TryParse(target, "icmp", out _, out var error));
        Assert.Contains("CIDR", error, StringComparison.OrdinalIgnoreCase);
        var store = EmptyStore();
        Assert.Throws<ArgumentException>(() => store.CreateCheck(CreateIcmp("blocked", "blocked-icmp", target)));
    }

    [Theory]
    [InlineData("10.0.0.1,10.0.0.2")]
    [InlineData("host a host b")]
    [InlineData("*.example.com")]
    [InlineData("icmp://203.0.113.10")]
    [InlineData("0.0.0.0")]
    [InlineData("255.255.255.255")]
    [InlineData("224.0.0.1")]
    public void Rejects_lists_urls_and_discovery_targets(string target)
    {
        Assert.False(CheckTarget.TryParse(target, "icmp", out _, out var error));
        Assert.False(string.IsNullOrWhiteSpace(error));
    }

    [Fact]
    public void Cannot_ping_is_fail_closed()
    {
        var at = DateTimeOffset.UtcNow;
        var missing = CheckRunner.EvaluateIcmp(false, null, "Operation not permitted", 0, at);
        Assert.Equal(CheckResultStatus.Fail, missing.Status);
        Assert.Contains("not permitted", missing.Error, StringComparison.OrdinalIgnoreCase);

        var exception = CheckRunner.EvaluateIcmp(false, IPStatus.Success, "SocketException: capability missing", 0, at);
        Assert.Equal(CheckResultStatus.Fail, exception.Status);
        Assert.DoesNotContain("ok", exception.Status.ApiValue(), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Runner_fail_closed_when_sender_cannot_ping()
    {
        var runner = CreateRunner(new ThrowingIcmpSender(new PingException("Operation not permitted")));
        var result = await runner.RunAsync(new StatusCheck
        {
            Type = CheckType.Icmp,
            TimeoutSeconds = 2,
            Target = new CheckTargetSpec { Host = "127.0.0.1" }
        }, CancellationToken.None);

        Assert.Equal(CheckResultStatus.Fail, result.Status);
        Assert.False(string.IsNullOrWhiteSpace(result.Error));
        Assert.NotEqual(CheckResultStatus.Ok, result.Status);
    }

    [Fact]
    public void Internal_icmp_hidden_from_public_summary()
    {
        var store = EmptyStore();
        var check = CreateIcmp("icmp-internal", "icmp-rfc1918", "10.0.0.5");
        store.CreateCheck(check);

        Assert.True(InternalHost.IsInternalCheck(store.ListChecks().Single(c => c.Name == "icmp-internal")));
        var leaf = store.FindComponent("icmp-rfc1918")!;
        Assert.True(ComponentVisibility.IsInternalLeaf(leaf, store.ListChecks()));

        for (var i = 0; i < 3; i++)
        {
            store.RecordCheckResult(store.ListChecks().Single(c => c.Name == "icmp-internal").Id, new CheckResult
            {
                Status = CheckResultStatus.Fail,
                Error = "fail-closed",
                CheckedAtUtc = DateTimeOffset.UtcNow
            });
        }

        Assert.Equal(CheckState.Down, store.FindCheck(store.ListChecks().Single(c => c.Name == "icmp-internal").Id)!.State);
        Assert.Equal(ComponentStatus.MajorOutage, store.FindComponent("icmp-rfc1918")!.Status);

        var publicState = PublicApiMapper.ForPublic(store);
        Assert.DoesNotContain(publicState.Components, c => c.Id == "icmp-rfc1918");
        Assert.DoesNotContain(publicState.Components, c => c.Name == "ICMP rfc1918");
    }

    [Fact]
    public void Public_icmp_appears_on_for_public_and_rollup()
    {
        var store = EmptyStore();
        store.CreateCheck(CreateIcmp("icmp-public", "icmp-public-leaf", "203.0.113.10"));
        var id = store.ListChecks().Single(c => c.Name == "icmp-public").Id;

        Assert.False(InternalHost.IsInternalCheck(store.FindCheck(id)!));
        for (var i = 0; i < 3; i++)
        {
            store.RecordCheckResult(id, new CheckResult
            {
                Status = CheckResultStatus.Fail,
                Error = "fail-closed",
                CheckedAtUtc = DateTimeOffset.UtcNow
            });
        }

        Assert.Equal(ComponentStatus.MajorOutage, store.FindComponent("icmp-public-leaf")!.Status);
        var publicState = PublicApiMapper.ForPublic(store);
        var leaf = Assert.Single(publicState.Components, c => c.Id == "icmp-public-leaf");
        Assert.Equal(ComponentStatus.MajorOutage, leaf.Status);
    }

    [Fact]
    public void Localhost_icmp_is_internal()
    {
        var store = EmptyStore();
        store.CreateCheck(CreateIcmp("icmp-loopback", "icmp-localhost", "localhost"));
        var publicState = PublicApiMapper.ForPublic(store);
        Assert.DoesNotContain(publicState.Components, c => c.Id == "icmp-localhost");
    }

    private static CreateCheckRequest CreateIcmp(string name, string componentId, string host) => new(
        name,
        componentId,
        "icmp",
        true,
        15,
        5,
        3,
        2,
        new CheckTargetSpec { Host = host },
        null,
        componentId == "icmp-rfc1918" ? "ICMP rfc1918" : "ICMP leaf");

    private static InMemoryStatusStore EmptyStore()
    {
        var state = DemoSeed.Create("http://localhost:5080", DateTimeOffset.UtcNow);
        state.Checks.Clear();
        return new InMemoryStatusStore(state);
    }

    private static CheckRunner CreateRunner(IIcmpSender sender)
    {
        var services = new ServiceCollection();
        services.AddHttpClient("StatusChecks");
        var factory = services.BuildServiceProvider().GetRequiredService<IHttpClientFactory>();
        return new CheckRunner(factory, NullLogger<CheckRunner>.Instance, sender);
    }

    private sealed class ThrowingIcmpSender(Exception error) : IIcmpSender
    {
        public Task<IcmpSendResult> SendAsync(string host, int timeoutMilliseconds, CancellationToken cancellationToken) =>
            throw error;
    }
}
