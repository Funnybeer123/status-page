using System.Net;
using System.Net.Http.Headers;
using Microsoft.Extensions.Configuration;
using StatusPage.Connectors;
using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Tests;

public class ConnectorTests
{
    [Fact]
    public void Connector_is_not_a_check_type()
    {
        Assert.False(DomainEnums.TryParseCheckType("connector", out _));
        Assert.True(DomainEnums.TryParseCheckType("icmp", out var icmp));
        Assert.Equal(CheckType.Icmp, icmp);
        Assert.True(DomainEnums.TryParseCheckType("tls_expiry", out var tls));
        Assert.Equal(CheckType.TlsExpiry, tls);
        Assert.True(DomainEnums.TryParseCheckType("dns", out var dns));
        Assert.Equal(CheckType.Dns, dns);
    }

    [Fact]
    public async Task Github_public_status_maps_indicator()
    {
        var handler = new StubHandler(_ => Json("""{"status":{"indicator":"none","description":"All Systems Operational"}}"""));
        var connector = new GitHubConnector(new HttpClient(handler), EmptyConfig());
        var imported = await connector.ImportAsync(CancellationToken.None);
        Assert.Equal("github", connector.Id);
        Assert.Equal("GitHub", connector.DisplayName);
        Assert.Equal("github-status", imported.ComponentId);
        Assert.Equal(ComponentStatus.Operational, imported.Status);
        Assert.True(imported.Healthy);
        Assert.Contains(GitHubConnector.PublicStatusUrl, handler.Urls);
        Assert.DoesNotContain(handler.Urls, url => url.Contains("api.github.com"));
    }

    [Fact]
    public async Task Github_major_indicator_is_major_outage()
    {
        var handler = new StubHandler(_ => Json("""{"status":{"indicator":"major","description":"Partial outage"}}"""));
        var connector = new GitHubConnector(new HttpClient(handler), EmptyConfig());
        var imported = await connector.ImportAsync(CancellationToken.None);
        Assert.Equal(ComponentStatus.MajorOutage, imported.Status);
        Assert.False(imported.Healthy);
    }

    [Fact]
    public async Task Azure_rss_item_maps_to_azure_status()
    {
        const string rss = """
            <rss><channel>
              <item>
                <title>Azure Portal - Investigating</title>
                <description>Advisory</description>
                <guid>evt-1</guid>
                <pubDate>Sat, 22 Aug 2026 12:00:00 GMT</pubDate>
              </item>
            </channel></rss>
            """;
        var handler = new StubHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(rss)
        });
        var connector = new AzureServiceHealthConnector(new HttpClient(handler), EmptyConfig());
        var imported = await connector.ImportAsync(CancellationToken.None);
        Assert.Equal("azure-service-health", connector.Id);
        Assert.Equal("azure-status", imported.ComponentId);
        Assert.Equal(ComponentStatus.PartialOutage, imported.Status);
        Assert.Contains(AzureServiceHealthConnector.PublicFeedUrl, handler.Urls);
        Assert.DoesNotContain(handler.Urls, url => url.Contains("management.azure.com"));
    }

    [Fact]
    public async Task Azure_arm_is_skipped_without_subscription()
    {
        var handler = new StubHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("<rss><channel></channel></rss>")
        });
        var called = false;
        var connector = new AzureServiceHealthConnector(
            new HttpClient(handler),
            EmptyConfig(),
            _ =>
            {
                called = true;
                return Task.FromResult<string?>("token");
            });
        var imported = await connector.ImportAsync(CancellationToken.None);
        Assert.Equal(ComponentStatus.Operational, imported.Status);
        Assert.False(called);
        Assert.DoesNotContain(handler.Urls, url => url.Contains("management.azure.com"));
    }

    [Fact]
    public async Task Azure_arm_is_tried_when_subscription_and_token_exist()
    {
        var handler = new StubHandler(request =>
        {
            if (request.RequestUri!.Host == "management.azure.com")
            {
                Assert.Equal("Bearer", request.Headers.Authorization?.Scheme);
                return Json("""{"value":[{"id":"/events/1","properties":{"title":"VM unavailable","eventType":"HealthAdvisory"}}]}""");
            }

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("<rss><channel></channel></rss>")
            };
        });
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Azure:SubscriptionId"] = "00000000-0000-0000-0000-000000000001"
        }).Build();
        var connector = new AzureServiceHealthConnector(
            new HttpClient(handler),
            config,
            _ => Task.FromResult<string?>("arm-token"));
        var imported = await connector.ImportAsync(CancellationToken.None);
        Assert.Contains(handler.Urls, url => url.Contains("management.azure.com"));
        Assert.Contains(imported.Events, e => e.Title.Contains("VM unavailable"));
    }

    [Fact]
    public async Task Azure_devops_public_health_maps_healthy()
    {
        var handler = new StubHandler(_ => Json("""{"status":{"health":"healthy","message":"All good"}}"""));
        var connector = new AzureDevOpsConnector(new HttpClient(handler), EmptyConfig());
        var imported = await connector.ImportAsync(CancellationToken.None);
        Assert.Equal("azure-devops", connector.Id);
        Assert.Equal("azure-devops-status", imported.ComponentId);
        Assert.Equal(ComponentStatus.Operational, imported.Status);
        Assert.Contains(AzureDevOpsConnector.PublicHealthUrl, handler.Urls);
        Assert.DoesNotContain(handler.Urls, url => url.Contains("dev.azure.com") && !url.Contains("status.dev.azure.com"));
    }

    [Fact]
    public void Import_does_not_override_checked_component_status()
    {
        var state = DemoSeed.Create("http://localhost:5080", DateTimeOffset.UtcNow);
        state.Checks.Clear();
        var store = new InMemoryStatusStore(state);
        store.CreateCheck(new CreateCheckRequest(
            "public https",
            "azure-status",
            "https",
            true,
            60,
            10,
            3,
            2,
            new CheckTargetSpec { Url = "https://azure.status.microsoft/status/feed/" },
            null));
        Assert.Equal(ComponentStatus.Operational, store.FindComponent("azure-status")!.Status);

        store.ApplyConnectorImport(new ConnectorSnapshot(
            "azure-service-health",
            "Azure Service Health",
            "azure-status",
            ComponentStatus.MajorOutage,
            "RSS advisory",
            DateTimeOffset.UtcNow,
            []));

        Assert.Equal(ComponentStatus.Operational, store.FindComponent("azure-status")!.Status);
        Assert.Contains(store.Snapshot().Incidents, i => i.ConnectorId == "azure-service-health" && !i.AutoFromChecks);
    }

    [Fact]
    public void Import_sets_status_when_component_has_no_checks()
    {
        var state = DemoSeed.Create("http://localhost:5080", DateTimeOffset.UtcNow);
        state.Checks.Clear();
        var store = new InMemoryStatusStore(state);
        store.ApplyConnectorImport(new ConnectorSnapshot(
            "github",
            "GitHub",
            "github-status",
            ComponentStatus.PartialOutage,
            "minor",
            DateTimeOffset.UtcNow,
            []));
        Assert.Equal(ComponentStatus.PartialOutage, store.FindComponent("github-status")!.Status);
        Assert.Contains(store.Snapshot().Incidents, i => i.ConnectorId == "github" && i.Status == IncidentStatus.Investigating);
    }

    private static IConfiguration EmptyConfig() =>
        new ConfigurationBuilder().AddInMemoryCollection().Build();

    private static HttpResponseMessage Json(string body) =>
        new(HttpStatusCode.OK)
        {
            Content = new StringContent(body)
            {
                Headers = { ContentType = new MediaTypeHeaderValue("application/json") }
            }
        };

    private sealed class StubHandler(Func<HttpRequestMessage, HttpResponseMessage> responder) : HttpMessageHandler
    {
        public List<string> Urls { get; } = [];

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Urls.Add(request.RequestUri?.ToString() ?? "");
            return Task.FromResult(responder(request));
        }
    }
}
