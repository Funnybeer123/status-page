using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Json;
using StatusPage.Api;
using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Tests;

public class PostmortemTests
{
    [Fact]
    public void Markdown_escapes_raw_html_and_rejects_javascript_links()
    {
        var html = PostmortemMarkdown.ToSafeHtml(
            "Root cause.\n\n<script>alert('xss-postmortem')</script>\n\n**Impact** was brief.\n\n[click](javascript:alert(1))");
        Assert.DoesNotContain("<script>", html, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("&lt;script&gt;", html);
        Assert.Contains("<strong>Impact</strong>", html);
        Assert.DoesNotContain("javascript:", html, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("click", html);
    }

    [Fact]
    public void Publish_rejects_check_targets_host_port_and_result_errors()
    {
        var state = DemoSeed.Create("http://localhost:5080", DateTimeOffset.UtcNow);
        var store = new InMemoryStatusStore(state);
        var check = store.CreateCheck(new CreateCheckRequest(
            "warehouse-probe",
            "billing-warehouse",
            "tcp",
            true,
            15,
            5,
            3,
            2,
            new CheckTargetSpec { Host = "10.0.0.8", Port = 5432 },
            null,
            "Billing warehouse"));
        store.RecordCheckResult(check.Id, new CheckResult
        {
            Status = CheckResultStatus.Fail,
            Error = "connection refused on warehouse-probe",
            LatencyMs = 12,
            CheckedAtUtc = DateTimeOffset.UtcNow
        });
        store.CreateCheck(new CreateCheckRequest(
            "docs-probe",
            "azure-status",
            "https",
            true,
            60,
            10,
            3,
            2,
            new CheckTargetSpec { Url = "https://example.com/pm-unit-health" },
            null));

        var incident = store.CreateIncident(new CreateIncidentRequest(
            "Warehouse blip",
            "resolved",
            "minor",
            "Resolved already.",
            ["billing-warehouse"],
            null,
            null), false);

        var target = Assert.Throws<ArgumentException>(() =>
            store.SavePostmortem(incident.Id, new WritePostmortemRequest(
                "Looked at 10.0.0.8:5432 during the outage.", true)));
        Assert.Contains("host:port", target.Message, StringComparison.OrdinalIgnoreCase);

        var url = Assert.Throws<ArgumentException>(() =>
            store.SavePostmortem(incident.Id, new WritePostmortemRequest(
                "Checked https://example.com/pm-unit-health", true)));
        Assert.Contains("check target", url.Message, StringComparison.OrdinalIgnoreCase);

        var error = Assert.Throws<ArgumentException>(() =>
            store.SavePostmortem(incident.Id, new WritePostmortemRequest(
                "Probe said connection refused on warehouse-probe", true)));
        Assert.Contains("result error", error.Message, StringComparison.OrdinalIgnoreCase);

        var saved = store.SavePostmortem(incident.Id, new WritePostmortemRequest(
            "Looked at 10.0.0.8:5432 during the outage.", false));
        Assert.False(saved.Postmortem!.Published);
        Assert.Contains("10.0.0.8:5432", saved.Postmortem.Body);
    }

    [Fact]
    public void Unpublished_is_stripped_from_public_snapshot()
    {
        var state = DemoSeed.Create("http://localhost:5080", DateTimeOffset.UtcNow);
        var store = new InMemoryStatusStore(state);
        var incident = store.CreateIncident(new CreateIncidentRequest(
            "Public advisory",
            "resolved",
            "minor",
            "Closed.",
            ["azure-status"],
            null,
            null), false);
        store.SavePostmortem(incident.Id, new WritePostmortemRequest("UNPUB_SECRET_MARKER staff only", false));

        var publicState = PublicApiMapper.ForPublic(store);
        var row = Assert.Single(publicState.Incidents, i => i.Id == incident.Id);
        Assert.Null(row.Postmortem);
        var json = JsonSerializer.Serialize(PublicApiMapper.Incidents(publicState));
        Assert.DoesNotContain("UNPUB_SECRET_MARKER", json);
    }

    [Fact]
    public async Task Unpublished_is_hidden_from_anonymous_home_and_v2_json()
    {
        using var factory = new StatusPageFactory();
        using var client = OperatorClient(factory);
        var marker = $"UNPUB_PM_{Guid.NewGuid():N}";
        var incidentId = await OpenResolved(client, "Unpublished postmortem advisory", "azure-status");

        using var saved = await client.PutAsJsonAsync($"/api/operator/incidents/{incidentId}/postmortem", new
        {
            body = $"## Notes\n{marker}",
            published = false
        });
        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);

        using var staff = await client.GetAsync($"/api/operator/incidents/{incidentId}/postmortem");
        using var staffDoc = JsonDocument.Parse(await staff.Content.ReadAsStringAsync());
        Assert.Contains(marker, staffDoc.RootElement.GetProperty("postmortem").GetProperty("body").GetString());
        Assert.False(staffDoc.RootElement.GetProperty("postmortem").GetProperty("published").GetBoolean());

        using var anonymous = factory.CreateClient();
        using var home = await anonymous.GetAsync("/");
        var homeHtml = await home.Content.ReadAsStringAsync();
        Assert.DoesNotContain(marker, homeHtml);

        using var incidents = await anonymous.GetAsync("/api/v2/incidents.json");
        var incidentsJson = await incidents.Content.ReadAsStringAsync();
        Assert.DoesNotContain(marker, incidentsJson);
        using var incidentsDoc = JsonDocument.Parse(incidentsJson);
        var listed = incidentsDoc.RootElement.GetProperty("incidents").EnumerateArray()
            .Single(i => i.GetProperty("id").GetString() == incidentId);
        Assert.Equal(JsonValueKind.Null, listed.GetProperty("postmortem").ValueKind);

        using var summary = await anonymous.GetAsync("/api/v2/summary.json");
        Assert.DoesNotContain(marker, await summary.Content.ReadAsStringAsync());

        using var page = await anonymous.GetAsync($"/incidents/{incidentId}");
        Assert.Equal(HttpStatusCode.OK, page.StatusCode);
        var pageHtml = await page.Content.ReadAsStringAsync();
        Assert.DoesNotContain(marker, pageHtml);
        Assert.DoesNotContain("data-postmortem", pageHtml);
    }

    [Fact]
    public async Task Published_is_visible_without_internals_and_html_is_not_executed()
    {
        using var factory = new StatusPageFactory();
        using var client = OperatorClient(factory);
        using var check = await client.PostAsJsonAsync("/api/checks", new
        {
            name = "pm-target-probe",
            componentId = "azure-status",
            type = "https",
            intervalSeconds = 60,
            timeoutSeconds = 10,
            target = new { url = "https://example.com/pm-unique-health" }
        });
        Assert.Equal(HttpStatusCode.Created, check.StatusCode);

        var incidentId = await OpenResolved(client, "Published postmortem advisory", "azure-status");
        var publicText = "Customer impact was brief after the vendor recovered.";
        using var rejected = await client.PutAsJsonAsync($"/api/operator/incidents/{incidentId}/postmortem", new
        {
            body = $"{publicText}\nChecked https://example.com/pm-unique-health and 10.0.0.8:5432",
            published = true
        });
        Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);

        using var published = await client.PutAsJsonAsync($"/api/operator/incidents/{incidentId}/postmortem", new
        {
            body = $"{publicText}\n\n<script>alert('xss-postmortem')</script>\n\n**Impact** was brief.",
            published = true
        });
        Assert.Equal(HttpStatusCode.OK, published.StatusCode);

        using var anonymous = factory.CreateClient();
        using var page = await anonymous.GetAsync($"/incidents/{incidentId}");
        Assert.Equal(HttpStatusCode.OK, page.StatusCode);
        var html = await page.Content.ReadAsStringAsync();
        Assert.Contains(publicText, html);
        Assert.Contains("data-postmortem=\"published\"", html);
        Assert.Contains("<strong>Impact</strong>", html);
        Assert.DoesNotContain("<script>alert('xss-postmortem')</script>", html);
        Assert.Contains("&lt;script&gt;", html);
        Assert.DoesNotContain("https://example.com/pm-unique-health", html);
        Assert.DoesNotContain("10.0.0.8:5432", html);
        Assert.DoesNotContain("pm-target-probe", html);

        using var incidents = await anonymous.GetAsync("/api/v2/incidents.json");
        using var incidentsDoc = JsonDocument.Parse(await incidents.Content.ReadAsStringAsync());
        var listed = incidentsDoc.RootElement.GetProperty("incidents").EnumerateArray()
            .Single(i => i.GetProperty("id").GetString() == incidentId);
        var postmortem = listed.GetProperty("postmortem");
        Assert.Equal(JsonValueKind.Object, postmortem.ValueKind);
        Assert.True(postmortem.GetProperty("published").GetBoolean());
        Assert.Contains(publicText, postmortem.GetProperty("body").GetString());
        Assert.DoesNotContain("https://example.com/pm-unique-health", postmortem.GetProperty("body").GetString());
        Assert.DoesNotContain("10.0.0.8", postmortem.GetProperty("body").GetString());
    }

    [Fact]
    public async Task Publishing_internal_only_incident_does_not_make_it_public()
    {
        using var factory = new StatusPageFactory();
        using var client = OperatorClient(factory);
        var marker = $"INTERNAL_PM_{Guid.NewGuid():N}";
        var incidentId = await OpenResolved(client, "Internal warehouse postmortem", "local-health");

        using var published = await client.PutAsJsonAsync($"/api/operator/incidents/{incidentId}/postmortem", new
        {
            body = $"## Internal review\n{marker}",
            published = true
        });
        Assert.Equal(HttpStatusCode.OK, published.StatusCode);

        using var staff = await client.GetAsync($"/api/operator/incidents/{incidentId}/postmortem");
        using var staffDoc = JsonDocument.Parse(await staff.Content.ReadAsStringAsync());
        Assert.True(staffDoc.RootElement.GetProperty("postmortem").GetProperty("published").GetBoolean());
        Assert.Contains(marker, staffDoc.RootElement.GetProperty("postmortem").GetProperty("body").GetString());

        using var anonymous = factory.CreateClient();
        using var page = await anonymous.GetAsync($"/incidents/{incidentId}");
        Assert.Equal(HttpStatusCode.NotFound, page.StatusCode);
        Assert.DoesNotContain(marker, await page.Content.ReadAsStringAsync());

        using var home = await anonymous.GetAsync("/");
        var homeHtml = await home.Content.ReadAsStringAsync();
        Assert.DoesNotContain(marker, homeHtml);
        Assert.DoesNotContain("Internal warehouse postmortem", homeHtml);

        using var incidents = await anonymous.GetAsync("/api/v2/incidents.json");
        var incidentsJson = await incidents.Content.ReadAsStringAsync();
        Assert.DoesNotContain(marker, incidentsJson);
        Assert.DoesNotContain("Internal warehouse postmortem", incidentsJson);
        using var incidentsDoc = JsonDocument.Parse(incidentsJson);
        Assert.DoesNotContain(
            incidentsDoc.RootElement.GetProperty("incidents").EnumerateArray(),
            i => i.GetProperty("id").GetString() == incidentId);
    }

    [Fact]
    public async Task StatusViewer_reads_unpublished_and_cannot_write()
    {
        using var factory = new EntraOperatorFactory();
        factory.Users.User = EntraPrincipal(roles: ["StatusOperator"]);
        using var client = factory.CreateClient();
        var marker = $"VIEWER_PM_{Guid.NewGuid():N}";
        var incidentId = await OpenResolved(client, "Viewer postmortem advisory", "azure-status");

        using var saved = await client.PutAsJsonAsync($"/api/operator/incidents/{incidentId}/postmortem", new
        {
            body = marker,
            published = false
        });
        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);

        factory.Users.User = EntraPrincipal(roles: ["StatusViewer"]);
        using var read = await client.GetAsync($"/api/operator/incidents/{incidentId}/postmortem");
        Assert.Equal(HttpStatusCode.OK, read.StatusCode);
        using var readDoc = JsonDocument.Parse(await read.Content.ReadAsStringAsync());
        Assert.Contains(marker, readDoc.RootElement.GetProperty("postmortem").GetProperty("body").GetString());
        Assert.False(readDoc.RootElement.GetProperty("postmortem").GetProperty("published").GetBoolean());

        using var list = await client.GetAsync("/api/operator/incidents");
        using var listDoc = JsonDocument.Parse(await list.Content.ReadAsStringAsync());
        var listed = listDoc.RootElement.EnumerateArray().Single(i => i.GetProperty("id").GetString() == incidentId);
        Assert.Contains(marker, listed.GetProperty("postmortem").GetProperty("body").GetString());

        factory.Users.User = EntraPrincipal(roles: ["StatusOperator"]);
        var hidden = $"VIEWER_INTERNAL_PM_{Guid.NewGuid():N}";
        var internalId = await OpenResolved(client, "Internal viewer postmortem", "local-health");
        using var internalSaved = await client.PutAsJsonAsync($"/api/operator/incidents/{internalId}/postmortem", new
        {
            body = hidden,
            published = false
        });
        Assert.Equal(HttpStatusCode.OK, internalSaved.StatusCode);

        factory.Users.User = EntraPrincipal(roles: ["StatusViewer"]);
        using var write = await client.PutAsJsonAsync($"/api/operator/incidents/{incidentId}/postmortem", new
        {
            body = "viewer cannot publish",
            published = true
        });
        Assert.Equal(HttpStatusCode.Forbidden, write.StatusCode);
        using var hiddenRead = await client.GetAsync($"/api/operator/incidents/{internalId}/postmortem");
        Assert.Equal(HttpStatusCode.NotFound, hiddenRead.StatusCode);

        using var page = await client.GetAsync($"/incidents/{incidentId}");
        Assert.Equal(HttpStatusCode.OK, page.StatusCode);
        var html = await page.Content.ReadAsStringAsync();
        Assert.Contains(marker, html);
        Assert.Contains("data-postmortem=\"unpublished\"", html);
    }

    [Fact]
    public async Task Cannot_write_postmortem_before_resolve()
    {
        using var factory = new StatusPageFactory();
        using var client = OperatorClient(factory);
        using var open = await client.PostAsJsonAsync("/api/operator/incidents", new
        {
            name = "Still investigating",
            status = "investigating",
            impact = "minor",
            body = "Open.",
            componentIds = new[] { "azure-status" }
        });
        Assert.Equal(HttpStatusCode.Created, open.StatusCode);
        using var openDoc = JsonDocument.Parse(await open.Content.ReadAsStringAsync());
        var id = openDoc.RootElement.GetProperty("id").GetString();

        using var denied = await client.PutAsJsonAsync($"/api/operator/incidents/{id}/postmortem", new
        {
            body = "Too early.",
            published = false
        });
        Assert.Equal(HttpStatusCode.BadRequest, denied.StatusCode);
    }

    [Fact]
    public async Task Anonymous_cannot_write_postmortem()
    {
        using var factory = new StatusPageFactory();
        using var anonymous = factory.CreateClient();
        using var denied = await anonymous.PutAsJsonAsync("/api/operator/incidents/missing/postmortem", new
        {
            body = "nope",
            published = true
        });
        Assert.Equal(HttpStatusCode.Unauthorized, denied.StatusCode);
    }

    private static async Task<string> OpenResolved(HttpClient client, string name, string componentId)
    {
        using var created = await client.PostAsJsonAsync("/api/operator/incidents", new
        {
            name,
            status = "investigating",
            impact = "minor",
            body = "Opened for postmortem tests.",
            componentIds = new[] { componentId }
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        using var createdDoc = JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        var id = createdDoc.RootElement.GetProperty("id").GetString();
        Assert.False(string.IsNullOrWhiteSpace(id));

        using var resolved = await client.PostAsJsonAsync($"/api/operator/incidents/{id}/updates", new
        {
            status = "resolved",
            body = "Resolved for postmortem tests."
        });
        Assert.Equal(HttpStatusCode.OK, resolved.StatusCode);
        return id!;
    }

    private static HttpClient OperatorClient(StatusPageFactory factory)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Api-Key", "dev-key");
        return client;
    }

    private static ClaimsPrincipal EntraPrincipal(IEnumerable<string>? roles = null)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, "test-user"),
            new("name", "test-user"),
            new("oid", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
        };
        foreach (var role in roles ?? [])
        {
            claims.Add(new Claim("roles", role));
        }

        return new ClaimsPrincipal(new ClaimsIdentity(claims, "oidc"));
    }
}
