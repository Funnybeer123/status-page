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
        Assert.Contains("API", names);
        Assert.Contains("example.com", names);

        foreach (var component in root.GetProperty("components").EnumerateArray())
        {
            Assert.Contains(component.GetProperty("status").GetString(),
                new[] { "operational", "degraded_performance", "partial_outage", "major_outage", "under_maintenance" });
            Assert.True(component.TryGetProperty("id", out _));
            Assert.True(component.TryGetProperty("group", out _));
        }

        var maintenances = root.GetProperty("scheduled_maintenances").EnumerateArray().ToList();
        Assert.NotEmpty(maintenances);
        foreach (var maintenance in maintenances)
        {
            Assert.True(maintenance.TryGetProperty("scheduled_for", out _));
            AssertIso8601(maintenance, "started_at");
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
        Assert.Contains("Past incidents", html);
        Assert.Contains("Elevated API timeouts", html);
        Assert.DoesNotContain("Subscribe", html, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Operator_can_create_check_and_incident_with_api_key()
    {
        using var unauthorizedClient = _factory.CreateClient();
        using var denied = await unauthorizedClient.PostAsync("/api/checks",
            JsonContent.Create(new { name = "x", componentId = "deib-portal", type = "tcp", target = new { host = "127.0.0.1", port = 9 } }));
        Assert.Equal(HttpStatusCode.Unauthorized, denied.StatusCode);

        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Api-Key", "dev-key");

        using var created = await client.PostAsync("/api/checks", JsonContent.Create(new
        {
            name = "portal tcp",
            componentId = "deib-portal",
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
            componentIds = new[] { "cca-api" }
        }));
        Assert.Equal(HttpStatusCode.Created, incident.StatusCode);

        using var patch = await client.SendAsync(new HttpRequestMessage(HttpMethod.Patch, "/api/operator/components/cca-dashboard")
        {
            Content = JsonContent.Create(new { status = "degraded_performance" })
        });
        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);

        using var summary = await client.GetAsync("/api/v2/summary.json");
        using var doc = JsonDocument.Parse(await summary.Content.ReadAsStringAsync());
        Assert.Equal("minor", doc.RootElement.GetProperty("status").GetProperty("indicator").GetString());
        var testIncident = doc.RootElement.GetProperty("incidents").EnumerateArray()
            .Single(i => i.GetProperty("name").GetString() == "Test incident");
        AssertIso8601(testIncident, "started_at");
        AssertStatuspageIncidentPayload(testIncident);
        var incidentComponent = testIncident.GetProperty("components").EnumerateArray()
            .Single(c => c.GetProperty("id").GetString() == "cca-api");
        Assert.Equal("local-status", incidentComponent.GetProperty("page_id").GetString());
        var affected = testIncident.GetProperty("incident_updates")[0].GetProperty("affected_components");
        Assert.Contains(affected.EnumerateArray(), a => a.GetProperty("code").GetString() == "cca-api");
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
            Assert.Equal(JsonValueKind.Array, affected.ValueKind);
            Assert.True(update.TryGetProperty("deliver_notifications", out var deliver));
            Assert.Equal(JsonValueKind.False, deliver.ValueKind);
            Assert.False(deliver.GetBoolean());

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
