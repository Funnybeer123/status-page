using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace StatusPage.Tests;

public class SummaryJsonTests : IClassFixture<StatusPageFactory>
{
    private readonly StatusPageFactory _factory;
    private readonly HttpClient _client;

    public SummaryJsonTests(StatusPageFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Summary_has_statuspage_shape()
    {
        using var response = await _client.GetAsync("/api/v2/summary.json");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = doc.RootElement;

        Assert.True(root.TryGetProperty("page", out var page));
        Assert.True(page.TryGetProperty("id", out _));
        Assert.True(page.TryGetProperty("name", out _));
        Assert.True(page.TryGetProperty("url", out _));
        Assert.True(page.TryGetProperty("updated_at", out _));

        Assert.True(root.TryGetProperty("status", out var status));
        var indicator = status.GetProperty("indicator").GetString();
        Assert.Contains(indicator, new[] { "none", "minor", "major", "critical" });
        Assert.False(string.IsNullOrWhiteSpace(status.GetProperty("description").GetString()));

        Assert.Equal(JsonValueKind.Array, root.GetProperty("components").ValueKind);
        Assert.Equal(JsonValueKind.Array, root.GetProperty("incidents").ValueKind);
        Assert.Equal(JsonValueKind.Array, root.GetProperty("scheduled_maintenances").ValueKind);

        var names = root.GetProperty("components").EnumerateArray().Select(c => c.GetProperty("name").GetString()).ToList();
        Assert.Contains("Cloud Cost Agent", names);
        Assert.Contains("DevOps Engineer-in-a-Box", names);
        Assert.Contains("Microsoft Azure", names);
        Assert.Contains("Azure DevOps", names);
        Assert.Contains("GitHub", names);
        Assert.DoesNotContain("example.com", names);

        foreach (var component in root.GetProperty("components").EnumerateArray())
        {
            Assert.Contains(component.GetProperty("status").GetString(),
                new[] { "operational", "degraded_performance", "partial_outage", "major_outage", "under_maintenance" });
            Assert.True(component.TryGetProperty("id", out _));
            Assert.True(component.TryGetProperty("group", out _));
        }

        foreach (var incident in root.GetProperty("incidents").EnumerateArray())
        {
            AssertIso8601(incident, "started_at");
            AssertStatuspageIncidentPayload(incident);
        }

        foreach (var maintenance in root.GetProperty("scheduled_maintenances").EnumerateArray())
        {
            Assert.True(maintenance.TryGetProperty("scheduled_for", out _));
            AssertIso8601(maintenance, "started_at");
            Assert.NotEqual(JsonValueKind.Null, maintenance.GetProperty("started_at").ValueKind);
            AssertStatuspageIncidentPayload(maintenance);
        }
    }

    [Fact]
    public async Task Status_and_components_endpoints_exist()
    {
        using var status = await _client.GetAsync("/api/v2/status.json");
        using var components = await _client.GetAsync("/api/v2/components.json");
        Assert.Equal(HttpStatusCode.OK, status.StatusCode);
        Assert.Equal(HttpStatusCode.OK, components.StatusCode);

        using var statusDoc = JsonDocument.Parse(await status.Content.ReadAsStringAsync());
        Assert.True(statusDoc.RootElement.TryGetProperty("status", out _));
        Assert.False(statusDoc.RootElement.TryGetProperty("components", out _));

        using var componentsDoc = JsonDocument.Parse(await components.Content.ReadAsStringAsync());
        Assert.True(componentsDoc.RootElement.GetProperty("components").GetArrayLength() > 0);
    }

    [Fact]
    public async Task Home_page_renders_banner_and_history()
    {
        using var response = await _client.GetAsync("/");
        var html = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("Cloud Cost Agent", html);
        Assert.Contains("DevOps Engineer-in-a-Box", html);
        Assert.Contains("Microsoft Azure", html);
        Assert.Contains("Azure DevOps", html);
        Assert.Contains("GitHub", html);
        Assert.Contains("Past incidents", html);
        Assert.Contains("hero", html);
        Assert.Contains("overall", html);
        Assert.Contains("service-card", html);
        Assert.Contains("uptime-bars", html);
        Assert.Contains("LIVE BUSINESS OPERATIONS", html);
        Assert.Contains("Overview", html);
        Assert.Contains("Incidents", html);
        Assert.Contains("CURRENT STATUS", html);
        Assert.DoesNotContain("Subscribe", html, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("site-footer", html);
    }

    [Fact]
    public async Task Operator_can_create_check_and_incident_with_api_key()
    {
        using var unauthorizedClient = _factory.CreateClient();
        using var denied = await unauthorizedClient.PostAsync("/api/checks",
            JsonContent.Create(new { name = "x", componentId = "github-status", type = "tcp", target = new { host = "127.0.0.1", port = 9 } }));
        Assert.Equal(HttpStatusCode.Unauthorized, denied.StatusCode);

        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Api-Key", "dev-key");

        using var created = await client.PostAsync("/api/checks", JsonContent.Create(new
        {
            name = "portal tcp",
            componentId = "github-status",
            type = "tcp",
            intervalSeconds = 15,
            timeoutSeconds = 2,
            target = new { host = "127.0.0.1", port = 9 }
        }));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);

        using var statusComponents = await client.GetAsync("/api/status/components");
        Assert.Equal(HttpStatusCode.OK, statusComponents.StatusCode);
        using var statusDoc = JsonDocument.Parse(await statusComponents.Content.ReadAsStringAsync());
        var row = statusDoc.RootElement.EnumerateArray().First();
        Assert.True(row.TryGetProperty("componentId", out _));
        Assert.True(row.TryGetProperty("status", out _));
        Assert.True(row.TryGetProperty("checkCount", out _));
        Assert.True(row.TryGetProperty("downCount", out _));
        Assert.True(row.TryGetProperty("updatedAtUtc", out _));

        using var incident = await client.PostAsync("/api/operator/incidents", JsonContent.Create(new
        {
            name = "Test incident",
            status = "investigating",
            impact = "minor",
            body = "Investigating a demo incident.",
            componentIds = new[] { "azure-status" }
        }));
        Assert.Equal(HttpStatusCode.Created, incident.StatusCode);

        using var patch = await client.SendAsync(new HttpRequestMessage(HttpMethod.Patch, "/api/operator/components/azure-devops-status")
        {
            Content = JsonContent.Create(new { status = "degraded_performance" })
        });
        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);

        using var summary = await client.GetAsync("/api/v2/summary.json");
        using var doc = JsonDocument.Parse(await summary.Content.ReadAsStringAsync());
        Assert.Equal("operational",
            doc.RootElement.GetProperty("components").EnumerateArray()
                .Single(c => c.GetProperty("id").GetString() == "azure-status")
                .GetProperty("status").GetString());
        Assert.Equal("operational",
            doc.RootElement.GetProperty("components").EnumerateArray()
                .Single(c => c.GetProperty("id").GetString() == "azure-devops-status")
                .GetProperty("status").GetString());
        var testIncident = doc.RootElement.GetProperty("incidents").EnumerateArray()
            .Single(i => i.GetProperty("name").GetString() == "Test incident");
        AssertIso8601(testIncident, "started_at");
        AssertStatuspageIncidentPayload(testIncident);
        var incidentComponent = testIncident.GetProperty("components").EnumerateArray()
            .Single(c => c.GetProperty("id").GetString() == "azure-status");
        Assert.Equal("local-status", incidentComponent.GetProperty("page_id").GetString());
        var affected = testIncident.GetProperty("incident_updates")[0].GetProperty("affected_components");
        Assert.Contains(affected.EnumerateArray(), a => a.GetProperty("code").GetString() == "azure-status");

        using var openIncident = await client.PostAsync("/api/operator/incidents", JsonContent.Create(new
        {
            name = "No affected components",
            status = "investigating",
            impact = "none",
            body = "Posted without a component list."
        }));
        Assert.Equal(HttpStatusCode.Created, openIncident.StatusCode);

        using var summaryAfter = await client.GetAsync("/api/v2/summary.json");
        using var afterDoc = JsonDocument.Parse(await summaryAfter.Content.ReadAsStringAsync());
        var open = afterDoc.RootElement.GetProperty("incidents").EnumerateArray()
            .Single(i => i.GetProperty("name").GetString() == "No affected components");
        AssertIso8601(open, "started_at");
        Assert.Equal(JsonValueKind.Null, open.GetProperty("incident_updates")[0].GetProperty("affected_components").ValueKind);
        Assert.False(open.GetProperty("incident_updates")[0].GetProperty("deliver_notifications").GetBoolean());
    }

    [Fact]
    public async Task Operator_can_create_check_on_new_component()
    {
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Api-Key", "dev-key");

        using var missingName = await client.PostAsync("/api/checks", JsonContent.Create(new
        {
            name = "probe-label-only",
            componentId = "orphan-leaf",
            type = "tcp",
            intervalSeconds = 15,
            timeoutSeconds = 2,
            target = new { host = "127.0.0.1", port = 9 }
        }));
        Assert.Equal(HttpStatusCode.BadRequest, missingName.StatusCode);

        using var created = await client.PostAsync("/api/checks", JsonContent.Create(new
        {
            name = "probe-label-only",
            componentId = "billing-warehouse",
            componentName = "Billing warehouse",
            type = "tcp",
            intervalSeconds = 15,
            timeoutSeconds = 2,
            target = new { host = "127.0.0.1", port = 9 }
        }));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);

        using var grouped = await client.PostAsync("/api/checks", JsonContent.Create(new
        {
            name = "ingest-probe-label",
            componentId = "cca-warehouse-feed",
            componentName = "Warehouse feed",
            groupId = "cloud-cost-agent",
            type = "tcp",
            intervalSeconds = 15,
            timeoutSeconds = 2,
            target = new { host = "127.0.0.1", port = 9 }
        }));
        Assert.Equal(HttpStatusCode.Created, grouped.StatusCode);

        using var statusComponents = await client.GetAsync("/api/status/components");
        using var statusDoc = JsonDocument.Parse(await statusComponents.Content.ReadAsStringAsync());
        Assert.Contains(statusDoc.RootElement.EnumerateArray(),
            row => row.GetProperty("componentId").GetString() == "billing-warehouse"
                   && row.GetProperty("status").GetString() == "operational");
        Assert.Contains(statusDoc.RootElement.EnumerateArray(),
            row => row.GetProperty("componentId").GetString() == "cca-warehouse-feed");

        using var summary = await client.GetAsync("/api/v2/summary.json");
        using var doc = JsonDocument.Parse(await summary.Content.ReadAsStringAsync());
        var billing = doc.RootElement.GetProperty("components").EnumerateArray()
            .Single(c => c.GetProperty("id").GetString() == "billing-warehouse");
        Assert.Equal("Billing warehouse", billing.GetProperty("name").GetString());
        Assert.NotEqual("probe-label-only", billing.GetProperty("name").GetString());
        Assert.Equal(JsonValueKind.Null, billing.GetProperty("group_id").ValueKind);
        Assert.False(billing.GetProperty("group").GetBoolean());
        Assert.Equal("operational", billing.GetProperty("status").GetString());

        var feed = doc.RootElement.GetProperty("components").EnumerateArray()
            .Single(c => c.GetProperty("id").GetString() == "cca-warehouse-feed");
        Assert.Equal("Warehouse feed", feed.GetProperty("name").GetString());
        Assert.NotEqual("ingest-probe-label", feed.GetProperty("name").GetString());
        Assert.Equal("cloud-cost-agent", feed.GetProperty("group_id").GetString());

        using var home = await client.GetAsync("/");
        var html = await home.Content.ReadAsStringAsync();
        Assert.Contains("Billing warehouse", html);
        Assert.Contains("Warehouse feed", html);
        Assert.DoesNotContain("probe-label-only", html);
    }

    private static void AssertStatuspageIncidentPayload(JsonElement incident)
    {
        foreach (var component in incident.GetProperty("components").EnumerateArray())
        {
            AssertStatuspageComponentObject(component);
        }

        var updates = incident.GetProperty("incident_updates");
        Assert.True(updates.GetArrayLength() > 0);
        foreach (var update in updates.EnumerateArray())
        {
            Assert.True(update.TryGetProperty("affected_components", out var affected));
            Assert.True(affected.ValueKind is JsonValueKind.Array or JsonValueKind.Null);
            Assert.True(update.TryGetProperty("deliver_notifications", out var deliver));
            Assert.True(deliver.ValueKind is JsonValueKind.True or JsonValueKind.False);
            Assert.False(deliver.GetBoolean());

            if (affected.ValueKind != JsonValueKind.Array)
            {
                continue;
            }

            foreach (var row in affected.EnumerateArray())
            {
                Assert.False(string.IsNullOrWhiteSpace(row.GetProperty("code").GetString()));
                Assert.False(string.IsNullOrWhiteSpace(row.GetProperty("name").GetString()));
                Assert.Contains(row.GetProperty("old_status").GetString(), ComponentStatuses);
                Assert.Contains(row.GetProperty("new_status").GetString(), ComponentStatuses);
            }
        }
    }

    private static void AssertStatuspageComponentObject(JsonElement component)
    {
        foreach (var field in new[]
                 {
                     "id", "name", "status", "created_at", "updated_at", "position", "description",
                     "showcase", "start_date", "group_id", "page_id", "group", "only_show_if_degraded"
                 })
        {
            Assert.True(component.TryGetProperty(field, out _), $"component missing {field}");
        }

        Assert.False(string.IsNullOrWhiteSpace(component.GetProperty("id").GetString()));
        Assert.False(string.IsNullOrWhiteSpace(component.GetProperty("name").GetString()));
        Assert.False(string.IsNullOrWhiteSpace(component.GetProperty("page_id").GetString()));
        Assert.Contains(component.GetProperty("status").GetString(), ComponentStatuses);
        Assert.True(component.GetProperty("group").ValueKind is JsonValueKind.True or JsonValueKind.False);
        Assert.True(component.GetProperty("showcase").ValueKind is JsonValueKind.True or JsonValueKind.False);
        Assert.True(component.GetProperty("only_show_if_degraded").ValueKind is JsonValueKind.True or JsonValueKind.False);
        Assert.True(component.GetProperty("start_date").ValueKind is JsonValueKind.Null or JsonValueKind.String);
        Assert.True(component.GetProperty("position").ValueKind == JsonValueKind.Number);
        AssertIso8601(component, "created_at");
        AssertIso8601(component, "updated_at");
    }

    private static void AssertIso8601(JsonElement parent, string name)
    {
        Assert.True(parent.TryGetProperty(name, out var value), $"missing {name}");
        Assert.Equal(JsonValueKind.String, value.ValueKind);
        var text = value.GetString();
        Assert.False(string.IsNullOrWhiteSpace(text));
        Assert.True(
            DateTimeOffset.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out _),
            $"{name} should be ISO-8601, got '{text}'");
    }

    private static readonly string[] ComponentStatuses =
    [
        "operational", "degraded_performance", "partial_outage", "major_outage", "under_maintenance"
    ];
}

public class StatusPageFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        var checksPath = Path.Combine(Path.GetTempPath(), $"status-page-checks-{Guid.NewGuid():N}.json");
        builder.UseSetting("StatusPage:EnableCheckWorker", "false");
        builder.UseSetting("StatusPage:ApiKey", "dev-key");
        builder.UseSetting("StatusPage:ChecksPath", checksPath);
        builder.UseEnvironment("Development");
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["StatusPage:EnableCheckWorker"] = "false",
                ["StatusPage:ApiKey"] = "dev-key",
                ["StatusPage:ChecksPath"] = checksPath
            });
        });
    }
}
