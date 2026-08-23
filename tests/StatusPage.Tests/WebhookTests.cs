using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using StatusPage.Api;
using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Tests;

public class WebhookTests
{
    public static TheoryData<string> BlockedWebhookUrls =>
    [
        "http://127.0.0.1/hook",
        "http://localhost/hook",
        "http://[::1]/hook",
        "http://10.1.2.3/hook",
        "http://192.168.10.20/hook",
        "http://172.16.4.4/hook",
        "http://169.254.1.1/hook",
        "http://169.254.169.254/latest/meta-data/",
        "http://metadata.google.internal/"
    ];

    [Theory]
    [MemberData(nameof(BlockedWebhookUrls))]
    public void Add_rejects_loopback_link_local_rfc1918_and_metadata_urls(string url)
    {
        var path = TempWebhooksPath();
        var store = new FileWebhookStore(path);
        var ex = Assert.Throws<ArgumentException>(() => store.Add(url));
        Assert.Contains("cannot be loopback, link-local, RFC1918, or cloud metadata", ex.Message);
        Assert.Empty(store.List());
    }

    [Fact]
    public void Add_allows_public_https_webhook()
    {
        var path = TempWebhooksPath();
        var store = new FileWebhookStore(path);
        var created = store.Add("https://example.com/hooks/status");
        Assert.Equal("https://example.com/hooks/status", created.Url);
        Assert.Equal(created.Url, Assert.Single(store.List()).Url);
    }

    [Fact]
    public void Webhook_payload_is_public_incident_and_public_component_status_only()
    {
        var (store, publicIncident, internalIncident, mixedIncident) = StoreWithPublicAndInternalIncidents();

        var publicState = PublicApiMapper.ForPublic(store);
        var payload = PublicApiMapper.WebhookPayload(publicState, publicIncident.Id, "incident.created");
        Assert.NotNull(payload);
        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(payload));
        var json = doc.RootElement.GetRawText();
        Assert.Equal("incident.created", doc.RootElement.GetProperty("event").GetString());
        var incident = doc.RootElement.GetProperty("incident");
        Assert.Equal(publicIncident.Id, incident.GetProperty("id").GetString());
        var componentIds = incident.GetProperty("components").EnumerateArray()
            .Select(c => c.GetProperty("id").GetString()).ToList();
        Assert.Contains("azure-status", componentIds);
        Assert.All(incident.GetProperty("components").EnumerateArray(),
            c => Assert.Contains(c.GetProperty("status").GetString(), ComponentStatuses));

        AssertNoInternalLeak(json);

        Assert.Null(PublicApiMapper.WebhookPayload(publicState, internalIncident.Id, "incident.created"));

        var mixed = PublicApiMapper.WebhookPayload(publicState, mixedIncident.Id, "incident.updated");
        Assert.NotNull(mixed);
        using var mixedDoc = JsonDocument.Parse(JsonSerializer.Serialize(mixed));
        var mixedIds = mixedDoc.RootElement.GetProperty("incident").GetProperty("components").EnumerateArray()
            .Select(c => c.GetProperty("id").GetString()).ToList();
        Assert.Contains("azure-status", mixedIds);
        Assert.DoesNotContain("internal-warehouse", mixedIds);
        AssertNoInternalLeak(mixedDoc.RootElement.GetRawText());
    }

    [Fact]
    public async Task Sender_posts_public_payload_only_and_skips_internal_only_incidents()
    {
        var hooks = new FileWebhookStore(TempWebhooksPath());
        hooks.Add("https://example.com/hooks/status");
        var (store, publicIncident, internalIncident, _) = StoreWithPublicAndInternalIncidents();
        var (sender, handler) = CreateSender(hooks, store);

        await sender.NotifyAsync(publicIncident.Id, "incident.created");
        var posted = Assert.Single(handler.Posts);
        Assert.Equal("https://example.com/hooks/status", posted.Url);
        using var doc = JsonDocument.Parse(posted.Body);
        Assert.Equal("incident.created", doc.RootElement.GetProperty("event").GetString());
        Assert.Equal(publicIncident.Id, doc.RootElement.GetProperty("incident").GetProperty("id").GetString());
        AssertNoInternalLeak(posted.Body);

        await sender.NotifyAsync(internalIncident.Id, "incident.created");
        Assert.Single(handler.Posts);
    }

    [Fact]
    public void CreateIncident_succeeds_when_webhook_throws()
    {
        var state = DemoSeed.Create("http://localhost:5080", DateTimeOffset.UtcNow);
        var store = new InMemoryStatusStore(state, webhooks: new ThrowingWebhookSender());
        var created = store.CreateIncident(new CreateIncidentRequest(
            "Webhook down",
            "investigating",
            "minor",
            "Create must succeed even if the webhook sender throws.",
            ["azure-status"],
            null,
            null), false);
        Assert.False(string.IsNullOrWhiteSpace(created.Id));
        Assert.Contains(store.Snapshot().Incidents, i => i.Id == created.Id);
    }

    [Fact]
    public async Task Operator_api_rejects_blocked_webhook_urls()
    {
        using var factory = new StatusPageFactory();
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Api-Key", "dev-key");

        foreach (var url in BlockedWebhookUrls)
        {
            using var denied = await client.PostAsJsonAsync("/api/operator/webhooks", new { url });
            Assert.Equal(HttpStatusCode.BadRequest, denied.StatusCode);
        }

        using var created = await client.PostAsJsonAsync("/api/operator/webhooks",
            new { url = "https://example.com/hooks/status" });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);

        using var anonymous = factory.CreateClient();
        using var home = await anonymous.GetAsync("/");
        var html = await home.Content.ReadAsStringAsync();
        Assert.DoesNotContain("Outbound webhooks", html);
        Assert.DoesNotContain("https://example.com/hooks/status", html);
        Assert.DoesNotContain("/api/operator/webhooks", html);
    }

    private static (InMemoryStatusStore Store, Incident Public, Incident Internal, Incident Mixed)
        StoreWithPublicAndInternalIncidents()
    {
        var state = DemoSeed.Create("http://localhost:5080", DateTimeOffset.UtcNow);
        state.Checks.Clear();
        var store = new InMemoryStatusStore(state);
        store.CreateCheck(new CreateCheckRequest(
            "warehouse-probe",
            "internal-warehouse",
            "tcp",
            true,
            15,
            5,
            3,
            2,
            new CheckTargetSpec { Host = "10.8.8.8", Port = 5432 },
            null,
            "Internal warehouse"));
        store.RecordCheckResult(store.ListChecks().Single(c => c.ComponentId == "internal-warehouse").Id,
            new CheckResult
            {
                Status = CheckResultStatus.Fail,
                Error = "connection refused to 10.8.8.8:5432 secret-probe-error",
                LatencyMs = 12,
                HttpStatus = 500,
                CheckedAtUtc = DateTimeOffset.UtcNow
            });

        var publicIncident = store.CreateIncident(new CreateIncidentRequest(
            "Public azure advisory",
            "investigating",
            "minor",
            "Watching Azure public status.",
            ["azure-status"],
            null,
            null), false);
        var internalIncident = store.CreateIncident(new CreateIncidentRequest(
            "Internal warehouse outage",
            "investigating",
            "major",
            "Internal leaf only.",
            ["internal-warehouse"],
            null,
            null), false);
        var mixedIncident = store.CreateIncident(new CreateIncidentRequest(
            "Mixed public and internal",
            "investigating",
            "minor",
            "Public plus internal leaf.",
            ["azure-status", "internal-warehouse"],
            null,
            null), false);
        return (store, publicIncident, internalIncident, mixedIncident);
    }

    private static void AssertNoInternalLeak(string json)
    {
        Assert.DoesNotContain("10.8.8.8", json, StringComparison.Ordinal);
        Assert.DoesNotContain("5432", json, StringComparison.Ordinal);
        Assert.DoesNotContain("internal-warehouse", json, StringComparison.Ordinal);
        Assert.DoesNotContain("secret-probe-error", json, StringComparison.Ordinal);
        Assert.DoesNotContain("connection refused", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("warehouse-probe", json, StringComparison.Ordinal);
        Assert.DoesNotContain("Authorization", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("autoFromChecks", json, StringComparison.Ordinal);
        Assert.DoesNotContain("connectorId", json, StringComparison.Ordinal);
        Assert.DoesNotContain("\"headers\"", json, StringComparison.Ordinal);
    }

    private static (WebhookSender Sender, CaptureHandler Handler) CreateSender(
        IWebhookStore hooks,
        IStatusStore status)
    {
        var handler = new CaptureHandler();
        var services = new ServiceCollection();
        services.AddSingleton(status);
        services.AddSingleton(hooks);
        services.AddSingleton<IHttpClientFactory>(new StubHttpClientFactory(handler));
        services.AddSingleton<ILogger<WebhookSender>>(NullLogger<WebhookSender>.Instance);
        services.AddSingleton<WebhookSender>();
        var provider = services.BuildServiceProvider();
        return (provider.GetRequiredService<WebhookSender>(), handler);
    }

    private static readonly string[] ComponentStatuses =
    [
        "operational", "degraded_performance", "partial_outage", "major_outage", "under_maintenance"
    ];

    private static string TempWebhooksPath() =>
        Path.Combine(Path.GetTempPath(), $"webhooks-{Guid.NewGuid():N}.json");

    private sealed class ThrowingWebhookSender : IWebhookSender
    {
        public void Enqueue(string incidentId, string eventType) =>
            throw new InvalidOperationException("webhook down");

        public Task NotifyAsync(string incidentId, string eventType, CancellationToken cancellationToken = default) =>
            throw new InvalidOperationException("webhook down");
    }

    private sealed class StubHttpClientFactory(HttpMessageHandler handler) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(handler, disposeHandler: false);
    }

    private sealed class CaptureHandler : HttpMessageHandler
    {
        public List<(string Url, string Body)> Posts { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            var body = request.Content is null ? "" : await request.Content.ReadAsStringAsync(cancellationToken);
            Posts.Add((request.RequestUri?.ToString() ?? "", body));
            return new HttpResponseMessage(HttpStatusCode.OK);
        }
    }
}
