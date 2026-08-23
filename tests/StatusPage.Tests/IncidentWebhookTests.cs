using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StatusPage.Api;
using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Tests;

public class IncidentWebhookTests : IClassFixture<StatusPageFactory>
{
    public const string TestSecret = "inbound-webhook-test-secret";

    private readonly StatusPageFactory _factory;

    public IncidentWebhookTests(StatusPageFactory factory) => _factory = factory;

    [Fact]
    public void Missing_secret_disables_the_path()
    {
        var empty = new ConfigurationBuilder().AddInMemoryCollection().Build();
        Assert.Null(IncidentWebhook.ExpectedSecret(empty));
        Assert.False(IncidentWebhook.IsEnabled(empty));

        var unset = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["StatusPage:EnableIncidentWebhook"] = "true",
            ["StatusPage:IncidentWebhookSecret"] = ""
        }).Build();
        Assert.False(IncidentWebhook.IsEnabled(unset));
    }

    [Fact]
    public void Disabled_flag_or_unset_secret_is_not_enabled()
    {
        var disabled = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["StatusPage:EnableIncidentWebhook"] = "false",
            ["StatusPage:IncidentWebhookSecret"] = TestSecret
        }).Build();
        Assert.False(IncidentWebhook.IsEnabled(disabled));
    }

    [Fact]
    public void Secret_compare_is_constant_time_and_does_not_use_the_secret_as_actor()
    {
        Assert.True(IncidentWebhook.SecretsEqual(TestSecret, TestSecret));
        Assert.False(IncidentWebhook.SecretsEqual("wrong-secret", TestSecret));
        Assert.False(IncidentWebhook.SecretsEqual("", TestSecret));
        Assert.False(IncidentWebhook.SecretsEqual(null, TestSecret));
        Assert.Equal("webhook", IncidentWebhook.Actor);
        Assert.DoesNotContain(TestSecret, IncidentWebhook.Actor);
        Assert.DoesNotContain("@", IncidentWebhook.Actor);
    }

    [Fact]
    public async Task Missing_secret_returns_404_not_401()
    {
        using var client = _factory.CreateClient();
        using var anonymous = await client.PostAsJsonAsync(IncidentWebhook.Path, PublicIncidentBody());
        Assert.Equal(HttpStatusCode.NotFound, anonymous.StatusCode);

        using var withHeader = _factory.CreateClient();
        withHeader.DefaultRequestHeaders.Add(IncidentWebhook.HeaderName, TestSecret);
        using var stillDisabled = await withHeader.PostAsJsonAsync(IncidentWebhook.Path, PublicIncidentBody());
        Assert.Equal(HttpStatusCode.NotFound, stillDisabled.StatusCode);

        using var withApiKey = _factory.CreateClient();
        withApiKey.DefaultRequestHeaders.Add("X-Api-Key", "dev-key");
        using var operatorKey = await withApiKey.PostAsJsonAsync(IncidentWebhook.Path, PublicIncidentBody());
        Assert.Equal(HttpStatusCode.NotFound, operatorKey.StatusCode);
    }

    [Fact]
    public async Task Disabled_flag_returns_404_even_when_secret_is_set()
    {
        using var factory = new IncidentWebhookFactory(TestSecret, enabled: false);
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add(IncidentWebhook.HeaderName, TestSecret);
        using var response = await client.PostAsJsonAsync(IncidentWebhook.Path, PublicIncidentBody());
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Bad_secret_returns_401()
    {
        using var factory = new IncidentWebhookFactory(TestSecret);
        using var client = factory.CreateClient();
        using var missing = await client.PostAsJsonAsync(IncidentWebhook.Path, PublicIncidentBody());
        Assert.Equal(HttpStatusCode.Unauthorized, missing.StatusCode);

        client.DefaultRequestHeaders.Add(IncidentWebhook.HeaderName, "not-the-secret");
        using var wrong = await client.PostAsJsonAsync(IncidentWebhook.Path, PublicIncidentBody());
        Assert.Equal(HttpStatusCode.Unauthorized, wrong.StatusCode);

        var body = await wrong.Content.ReadAsStringAsync();
        Assert.DoesNotContain(TestSecret, body);
    }

    [Fact]
    public async Task Internal_ids_return_400()
    {
        using var factory = new IncidentWebhookFactory(TestSecret);
        using var client = HookClient(factory);

        using var internalOnly = await client.PostAsJsonAsync(IncidentWebhook.Path, new
        {
            name = "Internal leak",
            status = "investigating",
            impact = "major",
            body = "Must reject internal leaf.",
            componentIds = new[] { "local-health" }
        });
        Assert.Equal(HttpStatusCode.BadRequest, internalOnly.StatusCode);
        Assert.Contains("internal component", await internalOnly.Content.ReadAsStringAsync());

        using var mixed = await client.PostAsJsonAsync(IncidentWebhook.Path, new
        {
            name = "Mixed leak",
            status = "investigating",
            impact = "minor",
            body = "Public plus internal.",
            componentIds = new[] { "azure-status", "local-health" }
        });
        Assert.Equal(HttpStatusCode.BadRequest, mixed.StatusCode);
        Assert.Contains("internal component", await mixed.Content.ReadAsStringAsync());

        var store = factory.Services.GetRequiredService<IStatusStore>();
        Assert.DoesNotContain(store.Snapshot().Incidents, i => i.Name.Contains("leak", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task Checked_leaf_is_not_overridden_and_check_results_are_not_written()
    {
        using var factory = new IncidentWebhookFactory(TestSecret);
        var store = factory.Services.GetRequiredService<IStatusStore>();
        var results = factory.Services.GetRequiredService<ICheckResultStore>();
        var azure = store.FindComponent("azure-status");
        Assert.NotNull(azure);
        var statusBefore = azure.Status;
        var check = Assert.Single(store.ListChecks(), c => c.ComponentId == "azure-status" && c.Enabled);
        var checkResultsBefore = check.Results.Count;
        var persistedBefore = results.List().Count(s => s.CheckId == check.Id);

        using var client = HookClient(factory);
        using var created = await client.PostAsJsonAsync(IncidentWebhook.Path, new
        {
            name = "Azure webhook advisory",
            status = "investigating",
            impact = "critical",
            body = "Inbound webhook must not override check rollup.",
            componentIds = new[] { "azure-status" },
            componentStatuses = new Dictionary<string, string> { ["azure-status"] = "major_outage" },
            url = "http://169.254.169.254/latest/meta-data/"
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        using var doc = JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        var id = doc.RootElement.GetProperty("id").GetString();
        Assert.False(string.IsNullOrWhiteSpace(id));

        var after = store.FindComponent("azure-status");
        Assert.NotNull(after);
        Assert.Equal(statusBefore, after.Status);
        Assert.NotEqual(ComponentStatus.MajorOutage, after.Status);

        var checkAfter = store.FindCheck(check.Id);
        Assert.NotNull(checkAfter);
        Assert.Equal(checkResultsBefore, checkAfter.Results.Count);
        Assert.Equal(persistedBefore, results.List().Count(s => s.CheckId == check.Id));

        Assert.Contains(store.Snapshot().Incidents, i => i.Id == id && i.ComponentIds.Contains("azure-status"));
    }

    [Fact]
    public async Task Open_and_update_public_incident_audits_as_webhook_never_the_secret()
    {
        using var factory = new IncidentWebhookFactory(TestSecret);
        using var client = HookClient(factory);
        using var created = await client.PostAsJsonAsync(IncidentWebhook.Path, PublicIncidentBody());
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        using var createdDoc = JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        var id = createdDoc.RootElement.GetProperty("id").GetString();
        Assert.False(string.IsNullOrWhiteSpace(id));

        using var updated = await client.PostAsJsonAsync(IncidentWebhook.Path, new
        {
            id,
            status = "identified",
            body = "Webhook update.",
            componentIds = new[] { "github-status" }
        });
        Assert.Equal(HttpStatusCode.OK, updated.StatusCode);

        var audit = factory.Services.GetRequiredService<IAuditLog>();
        var entries = audit.Recent().Where(e => e.TargetId == id).ToList();
        Assert.Contains(entries, e => e.Action == "incident.open");
        Assert.Contains(entries, e => e.Action == "incident.update");
        Assert.All(entries, e =>
        {
            Assert.Equal(IncidentWebhook.Actor, e.Actor);
            Assert.DoesNotContain("@", e.Actor);
            Assert.DoesNotContain(TestSecret, e.Actor);
            Assert.DoesNotContain(TestSecret, e.Action);
            Assert.DoesNotContain(TestSecret, e.TargetId);
        });

        var store = factory.Services.GetRequiredService<IStatusStore>();
        var incident = store.Snapshot().Incidents.Single(i => i.Id == id);
        Assert.Equal(IncidentStatus.Identified, incident.Status);
        Assert.Equal(["github-status"], incident.ComponentIds);
    }

    [Fact]
    public async Task Unchecked_public_leaf_can_take_webhook_status()
    {
        using var factory = new IncidentWebhookFactory(TestSecret);
        using var operatorClient = factory.CreateClient();
        operatorClient.DefaultRequestHeaders.Add("X-Api-Key", "dev-key");
        using var leaf = await operatorClient.PostAsJsonAsync("/api/operator/components", new
        {
            id = "webhook-leaf",
            name = "Webhook leaf",
            group = false
        });
        Assert.Equal(HttpStatusCode.Created, leaf.StatusCode);

        using var client = HookClient(factory);
        using var created = await client.PostAsJsonAsync(IncidentWebhook.Path, new
        {
            name = "Leaf without checks",
            status = "investigating",
            impact = "minor",
            body = "Status apply is allowed when there are no enabled checks.",
            componentIds = new[] { "webhook-leaf" },
            componentStatuses = new Dictionary<string, string> { ["webhook-leaf"] = "partial_outage" }
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);

        var store = factory.Services.GetRequiredService<IStatusStore>();
        Assert.Equal(ComponentStatus.PartialOutage, store.FindComponent("webhook-leaf")!.Status);
    }

    private static object PublicIncidentBody() => new
    {
        name = "Public webhook incident",
        status = "investigating",
        impact = "minor",
        body = "Inbound public incident.",
        componentIds = new[] { "github-status" }
    };

    private static HttpClient HookClient(IncidentWebhookFactory factory)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add(IncidentWebhook.HeaderName, TestSecret);
        return client;
    }
}

public sealed class IncidentWebhookFactory : WebApplicationFactory<Program>
{
    private readonly string? _secret;
    private readonly bool _enabled;

    public IncidentWebhookFactory(string? secret, bool enabled = true)
    {
        _secret = secret;
        _enabled = enabled;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        var checksPath = Path.Combine(Path.GetTempPath(), $"status-page-hook-checks-{Guid.NewGuid():N}.json");
        var pagePath = Path.Combine(Path.GetTempPath(), $"status-page-hook-page-{Guid.NewGuid():N}.json");
        var brandingPath = Path.Combine(Path.GetTempPath(), $"status-page-hook-brand-{Guid.NewGuid():N}");
        var resultsPath = Path.Combine(Path.GetTempPath(), $"status-page-hook-results-{Guid.NewGuid():N}.json");
        var auditPath = Path.Combine(Path.GetTempPath(), $"status-page-hook-audit-{Guid.NewGuid():N}.jsonl");
        var webhooksPath = Path.Combine(Path.GetTempPath(), $"status-page-hook-webhooks-{Guid.NewGuid():N}.json");
        var templatesPath = Path.Combine(Path.GetTempPath(), $"status-page-hook-templates-{Guid.NewGuid():N}.json");
        var templatesSeed = Path.Combine(Path.GetTempPath(), $"status-page-hook-templates-seed-{Guid.NewGuid():N}.json");
        builder.UseEnvironment("Development");
        builder.UseSetting("StatusPage:EnableCheckWorker", "false");
        builder.UseSetting("StatusPage:EnableConnectorWorker", "false");
        builder.UseSetting("StatusPage:ApiKey", "dev-key");
        builder.UseSetting("StatusPage:ChecksPath", checksPath);
        builder.UseSetting("StatusPage:PagePath", pagePath);
        builder.UseSetting("StatusPage:BrandingPath", brandingPath);
        builder.UseSetting("StatusPage:ResultsPath", resultsPath);
        builder.UseSetting("StatusPage:AuditPath", auditPath);
        builder.UseSetting("StatusPage:WebhooksPath", webhooksPath);
        builder.UseSetting("StatusPage:TemplatesPath", templatesPath);
        builder.UseSetting("StatusPage:TemplatesSeedPath", templatesSeed);
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["StatusPage:EnableCheckWorker"] = "false",
                ["StatusPage:EnableConnectorWorker"] = "false",
                ["StatusPage:ApiKey"] = "dev-key",
                ["StatusPage:ChecksPath"] = checksPath,
                ["StatusPage:PagePath"] = pagePath,
                ["StatusPage:BrandingPath"] = brandingPath,
                ["StatusPage:ResultsPath"] = resultsPath,
                ["StatusPage:AuditPath"] = auditPath,
                ["StatusPage:WebhooksPath"] = webhooksPath,
                ["StatusPage:TemplatesPath"] = templatesPath,
                ["StatusPage:TemplatesSeedPath"] = templatesSeed,
                ["StatusPage:EnableIncidentWebhook"] = _enabled ? "true" : "false",
                ["StatusPage:IncidentWebhookSecret"] = _secret,
                ["AzureAd:TenantId"] = "",
                ["AzureAd:ClientId"] = ""
            });
        });
    }
}
