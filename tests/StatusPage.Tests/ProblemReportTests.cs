using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using StatusPage.Services;

namespace StatusPage.Tests;

public class ProblemReportTests : IClassFixture<ProblemReportFactory>
{
    private readonly ProblemReportFactory _factory;

    public ProblemReportTests(ProblemReportFactory factory) => _factory = factory;

    [Fact]
    public async Task Anonymous_post_creates_operator_only_report_hidden_from_summary_and_home()
    {
        using var client = _factory.CreateClient();
        using var before = await client.GetAsync("/api/v2/summary.json");
        using var beforeDoc = JsonDocument.Parse(await before.Content.ReadAsStringAsync());
        var beforeStatuses = beforeDoc.RootElement.GetProperty("components").EnumerateArray()
            .ToDictionary(c => c.GetProperty("id").GetString()!, c => c.GetProperty("status").GetString());
        var title = $"anon-report-{Guid.NewGuid():N}";
        var body = "Customers cannot reach billing. This is operator-only.";

        using var created = await client.PostAsJsonAsync("/api/reports", new { title, body });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        using var createdDoc = JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        var id = createdDoc.RootElement.GetProperty("id").GetString();
        Assert.False(string.IsNullOrWhiteSpace(id));
        Assert.False(createdDoc.RootElement.TryGetProperty("componentIds", out _));

        using var summary = await client.GetAsync("/api/v2/summary.json");
        using var summaryDoc = JsonDocument.Parse(await summary.Content.ReadAsStringAsync());
        Assert.DoesNotContain(summaryDoc.RootElement.GetProperty("incidents").EnumerateArray(),
            i => i.GetProperty("name").GetString() == title);
        Assert.DoesNotContain(summaryDoc.RootElement.GetProperty("scheduled_maintenances").EnumerateArray(),
            i => i.GetProperty("name").GetString() == title);
        foreach (var (componentId, status) in beforeStatuses)
        {
            Assert.Equal(status,
                summaryDoc.RootElement.GetProperty("components").EnumerateArray()
                    .Single(c => c.GetProperty("id").GetString() == componentId)
                    .GetProperty("status").GetString());
        }

        using var home = await client.GetAsync("/");
        var html = await home.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, home.StatusCode);
        Assert.Contains("Report a problem", html);
        Assert.DoesNotContain(title, html);
        Assert.DoesNotContain(body, html);
        Assert.DoesNotContain("Problem reports", html);
        Assert.DoesNotContain("/api/operator/reports", html);
        Assert.DoesNotContain("local-health", html);
        Assert.DoesNotContain("chk-local-health", html);

        using var unauth = await client.GetAsync("/api/operator/reports");
        Assert.Equal(HttpStatusCode.Unauthorized, unauth.StatusCode);
        using var unauthPromote = await client.PostAsJsonAsync($"/api/operator/reports/{id}/promote", new
        {
            impact = "minor",
            componentIds = new[] { "azure-status" }
        });
        Assert.Equal(HttpStatusCode.Unauthorized, unauthPromote.StatusCode);

        using var operatorClient = _factory.CreateClient();
        operatorClient.DefaultRequestHeaders.Add("X-Api-Key", "dev-key");
        using var listed = await operatorClient.GetAsync("/api/operator/reports");
        Assert.Equal(HttpStatusCode.OK, listed.StatusCode);
        using var listedDoc = JsonDocument.Parse(await listed.Content.ReadAsStringAsync());
        var row = listedDoc.RootElement.EnumerateArray().Single(r => r.GetProperty("id").GetString() == id);
        Assert.Equal(title, row.GetProperty("title").GetString());
        Assert.Equal(body, row.GetProperty("body").GetString());
        Assert.Equal(JsonValueKind.Null, row.GetProperty("promotedIncidentId").ValueKind);

        using var operatorPage = await operatorClient.GetAsync("/operator");
        var operatorHtml = await operatorPage.Content.ReadAsStringAsync();
        Assert.Contains("Problem reports", operatorHtml);
        Assert.Contains(title, operatorHtml);
    }

    [Fact]
    public async Task Operator_promote_creates_public_incident_and_audits_api_key()
    {
        using var client = _factory.CreateClient();
        var title = $"promote-report-{Guid.NewGuid():N}";
        using var created = await client.PostAsJsonAsync("/api/reports", new
        {
            title,
            body = "Promote this to a public incident."
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        using var createdDoc = JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        var reportId = createdDoc.RootElement.GetProperty("id").GetString();

        using var operatorClient = _factory.CreateClient();
        operatorClient.DefaultRequestHeaders.Add("X-Api-Key", "dev-key");
        using var promote = await operatorClient.PostAsJsonAsync($"/api/operator/reports/{reportId}/promote", new
        {
            impact = "minor",
            componentIds = new[] { "azure-status" }
        });
        Assert.Equal(HttpStatusCode.Created, promote.StatusCode);
        using var promoteDoc = JsonDocument.Parse(await promote.Content.ReadAsStringAsync());
        var incidentId = promoteDoc.RootElement.GetProperty("id").GetString();
        Assert.False(string.IsNullOrWhiteSpace(incidentId));
        Assert.Equal(title, promoteDoc.RootElement.GetProperty("name").GetString());
        Assert.Equal("investigating", promoteDoc.RootElement.GetProperty("status").GetString());
        Assert.Contains(promoteDoc.RootElement.GetProperty("componentIds").EnumerateArray(),
            c => c.GetString() == "azure-status");
        Assert.DoesNotContain(promoteDoc.RootElement.GetProperty("componentIds").EnumerateArray(),
            c => c.GetString() == "local-health");

        using var summary = await client.GetAsync("/api/v2/summary.json");
        using var summaryDoc = JsonDocument.Parse(await summary.Content.ReadAsStringAsync());
        Assert.Contains(summaryDoc.RootElement.GetProperty("incidents").EnumerateArray(),
            i => i.GetProperty("id").GetString() == incidentId && i.GetProperty("name").GetString() == title);
        Assert.Equal("operational",
            summaryDoc.RootElement.GetProperty("components").EnumerateArray()
                .Single(c => c.GetProperty("id").GetString() == "azure-status")
                .GetProperty("status").GetString());

        var audit = _factory.Services.GetRequiredService<IAuditLog>();
        var entry = Assert.Single(audit.Recent(), e => e.TargetId == reportId && e.Action == "report.promote");
        Assert.Equal("api-key", entry.Actor);
        Assert.DoesNotContain("@", entry.Actor);

        using var listed = await operatorClient.GetAsync("/api/operator/reports");
        using var listedDoc = JsonDocument.Parse(await listed.Content.ReadAsStringAsync());
        var row = listedDoc.RootElement.EnumerateArray().Single(r => r.GetProperty("id").GetString() == reportId);
        Assert.Equal(incidentId, row.GetProperty("promotedIncidentId").GetString());

        using var again = await operatorClient.PostAsJsonAsync($"/api/operator/reports/{reportId}/promote", new
        {
            impact = "minor",
            componentIds = new[] { "azure-status" }
        });
        Assert.Equal(HttpStatusCode.Conflict, again.StatusCode);
    }

    [Fact]
    public async Task Promote_rejects_internal_component_ids()
    {
        using var client = _factory.CreateClient();
        using var created = await client.PostAsJsonAsync("/api/reports", new
        {
            title = $"internal-promote-{Guid.NewGuid():N}",
            body = "Must not attach local-health."
        });
        using var createdDoc = JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        var reportId = createdDoc.RootElement.GetProperty("id").GetString();

        using var operatorClient = _factory.CreateClient();
        operatorClient.DefaultRequestHeaders.Add("X-Api-Key", "dev-key");
        using var promote = await operatorClient.PostAsJsonAsync($"/api/operator/reports/{reportId}/promote", new
        {
            impact = "minor",
            componentIds = new[] { "local-health" }
        });
        Assert.Equal(HttpStatusCode.BadRequest, promote.StatusCode);
        Assert.Contains("internal", await promote.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);

        using var summary = await client.GetAsync("/api/v2/summary.json");
        using var summaryDoc = JsonDocument.Parse(await summary.Content.ReadAsStringAsync());
        Assert.DoesNotContain(summaryDoc.RootElement.GetProperty("incidents").EnumerateArray(),
            i => (i.GetProperty("name").GetString() ?? "").StartsWith("internal-promote-", StringComparison.Ordinal));
    }

    [Fact]
    public void Missing_title_or_body_is_rejected_and_does_not_open_incident()
    {
        var store = new InMemoryProblemReportStore();
        Assert.Throws<ArgumentException>(() => store.Create("", "body"));
        Assert.Throws<ArgumentException>(() => store.Create("title", " "));
        Assert.Empty(store.List());
    }
}

public class ProblemReportRateLimitTests : IClassFixture<ProblemReportRateLimitFactory>
{
    private readonly ProblemReportRateLimitFactory _factory;

    public ProblemReportRateLimitTests(ProblemReportRateLimitFactory factory) => _factory = factory;

    [Fact]
    public async Task Rate_limit_returns_429()
    {
        using var client = _factory.CreateClient();
        using var first = await client.PostAsJsonAsync("/api/reports", new
        {
            title = "first report",
            body = "Allowed once."
        });
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);

        using var second = await client.PostAsJsonAsync("/api/reports", new
        {
            title = "second report",
            body = "Should be rate limited."
        });
        Assert.Equal(HttpStatusCode.TooManyRequests, second.StatusCode);
        Assert.Contains("Too many reports", await second.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);
    }
}

public sealed class ProblemReportFactory : StatusPageFactory
{
    protected override IEnumerable<KeyValuePair<string, string?>> ExtraSettings() =>
        [new("StatusPage:ReportRateLimitMax", "50")];
}

public sealed class ProblemReportRateLimitFactory : StatusPageFactory
{
    protected override IEnumerable<KeyValuePair<string, string?>> ExtraSettings() =>
    [
        new("StatusPage:ReportRateLimitMax", "1"),
        new("StatusPage:ReportRateLimitWindowSeconds", "600")
    ];
}
