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
        Assert.Equal("open", row.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, row.GetProperty("promotedIncidentId").ValueKind);
        var hashedKey = row.GetProperty("rateLimitKey").GetString();
        Assert.False(string.IsNullOrWhiteSpace(hashedKey));
        Assert.False(ProblemReportRules.LooksLikeAddress(hashedKey));
        Assert.Equal(64, hashedKey!.Length);

        using var operatorPage = await operatorClient.GetAsync("/operator");
        var operatorHtml = await operatorPage.Content.ReadAsStringAsync();
        Assert.Contains("Problem reports", operatorHtml);
        Assert.Contains(title, operatorHtml);
        Assert.Contains(hashedKey, operatorHtml);
        Assert.DoesNotContain("Rate-limit IP", operatorHtml);
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
        Assert.Equal("promoted", row.GetProperty("status").GetString());

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

    [Fact]
    public void Reports_reload_from_file_without_raw_ip()
    {
        var path = Path.Combine(Path.GetTempPath(), $"reports-reload-{Guid.NewGuid():N}.json");
        var rawIp = "203.0.113.77";
        var hash = ProblemReportRules.HashRateLimitKey(rawIp);
        var store = new FileProblemReportStore(path);
        var created = store.Create(
            "reload-title",
            "reload-body",
            ["azure-status"],
            rawIp);

        var json = File.ReadAllText(path);
        Assert.DoesNotContain(rawIp, json);
        Assert.DoesNotContain("127.0.0.1", json);
        Assert.DoesNotContain("::1", json);
        Assert.DoesNotContain("remoteIp", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("\"ip\"", json, StringComparison.OrdinalIgnoreCase);
        Assert.Contains(hash, json);
        Assert.Contains("azure-status", json);
        Assert.Contains("\"status\"", json);
        Assert.Equal("open", created.Status);
        Assert.Equal(hash, created.RateLimitKey);

        var reloaded = new FileProblemReportStore(path);
        var report = Assert.Single(reloaded.List());
        Assert.Equal(created.Id, report.Id);
        Assert.Equal("reload-title", report.Title);
        Assert.Equal("reload-body", report.Body);
        Assert.Equal(["azure-status"], report.ComponentIds);
        Assert.Equal("open", report.Status);
        Assert.Equal(hash, report.RateLimitKey);
        Assert.False(ProblemReportRules.LooksLikeAddress(report.RateLimitKey));
    }

    [Fact]
    public async Task Public_create_stores_public_component_ids_and_rejects_internal()
    {
        using var client = _factory.CreateClient();
        var title = $"components-report-{Guid.NewGuid():N}";
        using var created = await client.PostAsJsonAsync("/api/reports", new
        {
            title,
            body = "Affects Azure public status.",
            componentIds = new[] { "azure-status" }
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        using var createdDoc = JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        Assert.False(createdDoc.RootElement.TryGetProperty("componentIds", out _));
        Assert.False(createdDoc.RootElement.TryGetProperty("rateLimitKey", out _));

        using var operatorClient = _factory.CreateClient();
        operatorClient.DefaultRequestHeaders.Add("X-Api-Key", "dev-key");
        using var listed = await operatorClient.GetAsync("/api/operator/reports");
        using var listedDoc = JsonDocument.Parse(await listed.Content.ReadAsStringAsync());
        var row = listedDoc.RootElement.EnumerateArray().Single(r => r.GetProperty("title").GetString() == title);
        Assert.Contains(row.GetProperty("componentIds").EnumerateArray(), c => c.GetString() == "azure-status");
        Assert.DoesNotContain(row.GetProperty("componentIds").EnumerateArray(), c => c.GetString() == "local-health");

        using var internalIds = await client.PostAsJsonAsync("/api/reports", new
        {
            title = $"internal-ids-{Guid.NewGuid():N}",
            body = "Must reject internal leaf.",
            componentIds = new[] { "local-health" }
        });
        Assert.Equal(HttpStatusCode.BadRequest, internalIds.StatusCode);
        Assert.Contains("internal", await internalIds.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);
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
        var limitedBody = await second.Content.ReadAsStringAsync();
        Assert.Contains("Too many reports", limitedBody, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("127.0.0.1", limitedBody);
        Assert.DoesNotContain("::1", limitedBody);

        var store = _factory.Services.GetRequiredService<IProblemReportStore>();
        var report = Assert.Single(store.List());
        Assert.False(ProblemReportRules.LooksLikeAddress(report.RateLimitKey));
        Assert.Equal(64, report.RateLimitKey.Length);
        Assert.DoesNotContain(".", report.RateLimitKey);
        Assert.DoesNotContain(":", report.RateLimitKey);

        var json = File.ReadAllText(_factory.ReportsPath);
        Assert.DoesNotContain("127.0.0.1", json);
        Assert.DoesNotContain("::1", json);
        Assert.Contains(report.RateLimitKey, json);

        var limiter = _factory.Services.GetRequiredService<IReportRateLimiter>();
        Assert.False(limiter.TryAcquire(report.RateLimitKey));
        Assert.True(limiter.TryAcquire(ProblemReportRules.HashRateLimitKey("203.0.113.8")));
    }

    [Fact]
    public void Rate_limit_429_is_keyed_by_hash_not_raw_ip()
    {
        var rawIp = "198.51.100.23";
        var hash = ProblemReportRules.HashRateLimitKey(rawIp);
        Assert.NotEqual(rawIp, hash);
        Assert.DoesNotContain(rawIp, hash);
        Assert.False(ProblemReportRules.LooksLikeAddress(hash));

        var limiter = new InMemoryReportRateLimiter(1, TimeSpan.FromMinutes(10));
        Assert.True(limiter.TryAcquire(hash));
        Assert.False(limiter.TryAcquire(hash));
        Assert.True(limiter.TryAcquire(ProblemReportRules.HashRateLimitKey("198.51.100.24")));
        Assert.True(limiter.TryAcquire(rawIp));
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
