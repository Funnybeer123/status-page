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

        foreach (var maintenance in root.GetProperty("scheduled_maintenances").EnumerateArray())
        {
            Assert.True(maintenance.TryGetProperty("scheduled_for", out _));
            Assert.True(maintenance.TryGetProperty("incident_updates", out var updates));
            Assert.True(updates.GetArrayLength() > 0);
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
        Assert.Contains(doc.RootElement.GetProperty("incidents").EnumerateArray(),
            i => i.GetProperty("name").GetString() == "Test incident");
    }
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
