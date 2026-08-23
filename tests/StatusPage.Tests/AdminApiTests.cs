using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Tests;

public class AdminApiTests : IClassFixture<StatusPageFactory>
{
    private readonly StatusPageFactory _factory;

    public AdminApiTests(StatusPageFactory factory) => _factory = factory;

    [Fact]
    public async Task Check_admin_lists_internal_and_supports_enable_edit_delete()
    {
        using var client = OperatorClient();
        using var created = await client.PostAsJsonAsync("/api/checks", new
        {
            name = "admin-probe",
            componentId = "admin-leaf",
            componentName = "Admin leaf",
            type = "tcp",
            intervalSeconds = 15,
            timeoutSeconds = 2,
            target = new { host = "10.1.2.3", port = 5432 }
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        using var createdDoc = JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        var id = createdDoc.RootElement.GetProperty("id").GetString();
        Assert.False(string.IsNullOrWhiteSpace(id));
        Assert.True(createdDoc.RootElement.TryGetProperty("consecutiveFailures", out _));
        Assert.True(createdDoc.RootElement.TryGetProperty("consecutiveSuccesses", out _));

        using var list = await client.GetAsync("/api/checks");
        using var listDoc = JsonDocument.Parse(await list.Content.ReadAsStringAsync());
        Assert.Contains(listDoc.RootElement.EnumerateArray(), c => c.GetProperty("id").GetString() == id);

        using var disabled = await client.PatchAsJsonAsync($"/api/checks/{id}", new { enabled = false });
        Assert.Equal(HttpStatusCode.OK, disabled.StatusCode);
        using var disabledDoc = JsonDocument.Parse(await disabled.Content.ReadAsStringAsync());
        Assert.False(disabledDoc.RootElement.GetProperty("enabled").GetBoolean());

        using var renamed = await client.PatchAsJsonAsync($"/api/checks/{id}", new { name = "admin-probe-renamed", intervalSeconds = 30 });
        Assert.Equal(HttpStatusCode.OK, renamed.StatusCode);
        using var renamedDoc = JsonDocument.Parse(await renamed.Content.ReadAsStringAsync());
        Assert.Equal("admin-probe-renamed", renamedDoc.RootElement.GetProperty("name").GetString());
        Assert.Equal(30, renamedDoc.RootElement.GetProperty("intervalSeconds").GetInt32());
        Assert.False(renamedDoc.RootElement.GetProperty("enabled").GetBoolean());

        using var full = await client.PutAsJsonAsync($"/api/checks/{id}", new
        {
            name = "admin-probe-put",
            componentId = "admin-leaf",
            componentName = "Admin leaf",
            type = "tcp",
            enabled = false,
            intervalSeconds = 45,
            timeoutSeconds = 3,
            target = new { host = "10.1.2.3", port = 5432 }
        });
        Assert.Equal(HttpStatusCode.OK, full.StatusCode);
        using var fullDoc = JsonDocument.Parse(await full.Content.ReadAsStringAsync());
        Assert.Equal("admin-probe-put", fullDoc.RootElement.GetProperty("name").GetString());
        Assert.Equal(45, fullDoc.RootElement.GetProperty("intervalSeconds").GetInt32());

        using var oldEnabled = await client.PatchAsJsonAsync($"/api/checks/{id}/enabled", new { enabled = true });
        Assert.Equal(HttpStatusCode.NotFound, oldEnabled.StatusCode);

        using var publicSummary = await client.GetAsync("/api/v2/summary.json");
        using var summary = JsonDocument.Parse(await publicSummary.Content.ReadAsStringAsync());
        Assert.DoesNotContain(summary.RootElement.GetProperty("components").EnumerateArray(),
            c => c.GetProperty("id").GetString() == "admin-leaf");

        using var deleted = await client.DeleteAsync($"/api/checks/{id}");
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
    }

    [Fact]
    public async Task Dns_expected_addresses_round_trip()
    {
        using var client = OperatorClient();
        using var created = await client.PostAsJsonAsync("/api/checks", new
        {
            name = "dns-probe",
            componentId = "dns-leaf",
            componentName = "DNS leaf",
            type = "dns",
            intervalSeconds = 30,
            timeoutSeconds = 5,
            target = new { host = "localhost" },
            dns = new { expectedAddresses = new[] { "127.0.0.1" } }
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        using var doc = JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        Assert.Equal("dns", doc.RootElement.GetProperty("type").GetString());
        Assert.Contains(doc.RootElement.GetProperty("dns").GetProperty("expectedAddresses").EnumerateArray(),
            a => a.GetString() == "127.0.0.1");
    }

    [Fact]
    public void Disable_drops_check_out_of_rollup()
    {
        var state = DemoSeed.Create("http://localhost:5080", DateTimeOffset.UtcNow);
        state.Checks.Clear();
        var store = new InMemoryStatusStore(state);
        store.CreateCheck(new CreateCheckRequest(
            "only",
            "azure-status",
            "tcp",
            true,
            15,
            5,
            3,
            2,
            new CheckTargetSpec { Host = "127.0.0.1", Port = 9 },
            null));
        var id = store.ListChecks().Single(c => c.Name == "only").Id;
        for (var i = 0; i < 3; i++)
        {
            store.RecordCheckResult(id, new CheckResult { Status = CheckResultStatus.Fail, Error = "fail", CheckedAtUtc = DateTimeOffset.UtcNow });
        }

        Assert.Equal(ComponentStatus.MajorOutage, store.FindComponent("azure-status")!.Status);
        store.SetCheckEnabled(id, false);
        Assert.Equal(ComponentStatus.Operational, store.FindComponent("azure-status")!.Status);
        Assert.False(store.FindCheck(id)!.Enabled);
    }

    [Fact]
    public async Task Patch_disable_drops_rollup_immediately_and_run_is_same_target_only()
    {
        using var client = OperatorClient();
        using var created = await client.PostAsJsonAsync("/api/checks", new
        {
            name = "run-probe",
            componentId = "run-leaf",
            componentName = "Run leaf",
            type = "tcp",
            intervalSeconds = 15,
            timeoutSeconds = 2,
            target = new { host = "127.0.0.1", port = 9 }
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        using var createdDoc = JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        var id = createdDoc.RootElement.GetProperty("id").GetString();
        Assert.False(string.IsNullOrWhiteSpace(id));

        for (var i = 0; i < 3; i++)
        {
            using var run = await client.PostAsJsonAsync($"/api/checks/{id}/run", new { });
            Assert.Equal(HttpStatusCode.OK, run.StatusCode);
            using var runDoc = JsonDocument.Parse(await run.Content.ReadAsStringAsync());
            Assert.Equal("fail", runDoc.RootElement.GetProperty("result").GetProperty("status").GetString());
            Assert.Equal("127.0.0.1", runDoc.RootElement.GetProperty("check").GetProperty("target").GetProperty("host").GetString());
        }

        using var afterFail = await client.GetAsync("/api/operator/components");
        using var afterFailDoc = JsonDocument.Parse(await afterFail.Content.ReadAsStringAsync());
        Assert.Equal("major_outage",
            afterFailDoc.RootElement.EnumerateArray().Single(c => c.GetProperty("id").GetString() == "run-leaf")
                .GetProperty("status").GetString());

        using var disabled = await client.PatchAsJsonAsync($"/api/checks/{id}", new { enabled = false });
        Assert.Equal(HttpStatusCode.OK, disabled.StatusCode);

        using var afterDisable = await client.GetAsync("/api/operator/components");
        using var afterDisableDoc = JsonDocument.Parse(await afterDisable.Content.ReadAsStringAsync());
        Assert.Equal("operational",
            afterDisableDoc.RootElement.EnumerateArray().Single(c => c.GetProperty("id").GetString() == "run-leaf")
                .GetProperty("status").GetString());

        using var rejected = await client.PostAsJsonAsync($"/api/checks/{id}/run", new
        {
            target = new { host = "8.8.8.8", port = 53 }
        });
        Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);
        Assert.Contains("stored target", await rejected.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);

        using var patchHost = await client.PatchAsJsonAsync($"/api/checks/{id}", new { target = new { host = "8.8.8.8", port = 53 } });
        Assert.Equal(HttpStatusCode.BadRequest, patchHost.StatusCode);

        using var sameHost = await client.PostAsJsonAsync($"/api/checks/{id}/run", new
        {
            target = new { host = "127.0.0.1", port = 9 }
        });
        Assert.Equal(HttpStatusCode.OK, sameHost.StatusCode);

        using var got = await client.GetAsync($"/api/checks/{id}");
        using var gotDoc = JsonDocument.Parse(await got.Content.ReadAsStringAsync());
        Assert.Equal("127.0.0.1", gotDoc.RootElement.GetProperty("target").GetProperty("host").GetString());
        Assert.Equal(9, gotDoc.RootElement.GetProperty("target").GetProperty("port").GetInt32());
    }

    [Fact]
    public async Task Component_group_and_page_admin_round_trip()
    {
        using var client = OperatorClient();
        using var group = await client.PostAsJsonAsync("/api/operator/components", new
        {
            id = "ops-group",
            name = "Ops group",
            group = true
        });
        Assert.Equal(HttpStatusCode.Created, group.StatusCode);

        using var leaf = await client.PostAsJsonAsync("/api/operator/components", new
        {
            id = "ops-leaf",
            name = "Ops leaf",
            group = false,
            groupId = "ops-group",
            description = "operator created"
        });
        Assert.Equal(HttpStatusCode.Created, leaf.StatusCode);

        using var renamed = await client.PutAsJsonAsync("/api/operator/components/ops-leaf", new
        {
            name = "Ops leaf renamed",
            groupId = "ops-group"
        });
        Assert.Equal(HttpStatusCode.OK, renamed.StatusCode);

        using var page = await client.PatchAsJsonAsync("/api/operator/page", new { name = "Local brand" });
        Assert.Equal(HttpStatusCode.OK, page.StatusCode);
        using var pageDoc = JsonDocument.Parse(await page.Content.ReadAsStringAsync());
        Assert.Equal("Local brand", pageDoc.RootElement.GetProperty("name").GetString());

        using var logo = await client.PostAsync("/api/operator/page/logo", PngLogoContent());
        Assert.Equal(HttpStatusCode.OK, logo.StatusCode);
        using var logoDoc = JsonDocument.Parse(await logo.Content.ReadAsStringAsync());
        var logoUrl = logoDoc.RootElement.GetProperty("logoUrl").GetString();
        Assert.StartsWith("/branding/logo", logoUrl);

        using var served = await client.GetAsync(logoUrl);
        Assert.Equal(HttpStatusCode.OK, served.StatusCode);
        Assert.Equal("image/png", served.Content.Headers.ContentType?.MediaType);

        using var blocked = await client.DeleteAsync("/api/operator/components/ops-group");
        Assert.Equal(HttpStatusCode.BadRequest, blocked.StatusCode);

        using var goneLeaf = await client.DeleteAsync("/api/operator/components/ops-leaf");
        Assert.Equal(HttpStatusCode.NoContent, goneLeaf.StatusCode);
        using var goneGroup = await client.DeleteAsync("/api/operator/components/ops-group");
        Assert.Equal(HttpStatusCode.NoContent, goneGroup.StatusCode);
    }

    [Fact]
    public async Task Incident_and_maintenance_admin_do_not_override_checked_component()
    {
        using var client = OperatorClient();
        using var check = await client.PostAsJsonAsync("/api/checks", new
        {
            name = "keep-rollup",
            componentId = "github-status",
            type = "https",
            intervalSeconds = 60,
            timeoutSeconds = 10,
            target = new { url = "https://www.githubstatus.com/api/v2/status.json" }
        });
        Assert.Equal(HttpStatusCode.Created, check.StatusCode);

        using var incident = await client.PostAsJsonAsync("/api/operator/incidents", new
        {
            name = "Admin note",
            status = "investigating",
            impact = "minor",
            body = "Opened from admin.",
            componentIds = new[] { "github-status" }
        });
        Assert.Equal(HttpStatusCode.Created, incident.StatusCode);
        using var incidentDoc = JsonDocument.Parse(await incident.Content.ReadAsStringAsync());
        var incidentId = incidentDoc.RootElement.GetProperty("id").GetString();

        using var summary = await client.GetAsync("/api/v2/summary.json");
        using var summaryDoc = JsonDocument.Parse(await summary.Content.ReadAsStringAsync());
        Assert.Equal("operational",
            summaryDoc.RootElement.GetProperty("components").EnumerateArray()
                .Single(c => c.GetProperty("id").GetString() == "github-status")
                .GetProperty("status").GetString());

        using var resolved = await client.PostAsJsonAsync($"/api/operator/incidents/{incidentId}/updates", new
        {
            status = "resolved",
            body = "Closed from admin."
        });
        Assert.Equal(HttpStatusCode.OK, resolved.StatusCode);

        using var maintenance = await client.PostAsJsonAsync("/api/operator/incidents", new
        {
            name = "Window",
            status = "scheduled",
            impact = "maintenance",
            body = "Planned.",
            maintenance = true,
            componentIds = new[] { "github-status" },
            scheduledFor = DateTimeOffset.UtcNow.AddHours(1),
            scheduledUntil = DateTimeOffset.UtcNow.AddHours(2)
        });
        Assert.Equal(HttpStatusCode.Created, maintenance.StatusCode);
    }

    [Fact]
    public async Task Public_page_does_not_expose_admin()
    {
        using var client = _factory.CreateClient();
        using var home = await client.GetAsync("/");
        var html = await home.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, home.StatusCode);
        Assert.Contains("Business Systems", html);
        foreach (var leak in new[]
                 {
                     "OPERATOR ADMIN", "Add a check", "Create check", "Save branding",
                     "/api/operator", "/api/checks", "Disable", "Upload logo", "Run now",
                     "Audit log"
                 })
        {
            Assert.DoesNotContain(leak, html);
        }

        using var unauth = await client.GetAsync("/api/operator/page");
        Assert.Equal(HttpStatusCode.Unauthorized, unauth.StatusCode);
        using var unauthChecks = await client.GetAsync("/api/checks");
        Assert.Equal(HttpStatusCode.Unauthorized, unauthChecks.StatusCode);
        using var unauthRun = await client.PostAsJsonAsync("/api/checks/chk-github-status/run", new { });
        Assert.Equal(HttpStatusCode.Unauthorized, unauthRun.StatusCode);
        using var unauthLogo = await client.PostAsync("/api/operator/page/logo", PngLogoContent());
        Assert.Equal(HttpStatusCode.Unauthorized, unauthLogo.StatusCode);
    }

    private HttpClient OperatorClient()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Api-Key", "dev-key");
        return client;
    }

    private static MultipartFormDataContent PngLogoContent()
    {
        var png = Convert.FromBase64String(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");
        var content = new MultipartFormDataContent();
        var file = new ByteArrayContent(png);
        file.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/png");
        content.Add(file, "logo", "logo.png");
        return content;
    }
}

internal static class HttpClientJsonPatch
{
    public static Task<HttpResponseMessage> PatchAsJsonAsync<T>(this HttpClient client, string url, T value) =>
        client.PatchAsync(url, JsonContent.Create(value));
}
