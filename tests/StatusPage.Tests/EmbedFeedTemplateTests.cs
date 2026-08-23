using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Xml.Linq;
using StatusPage.Api;
using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Tests;

public class EmbedFeedTemplateTests : IClassFixture<StatusPageFactory>
{
    private readonly StatusPageFactory _factory;

    public EmbedFeedTemplateTests(StatusPageFactory factory) => _factory = factory;

    [Fact]
    public async Task Embed_omits_internal_leaves_check_targets_and_probe_errors()
    {
        using var client = OperatorClient();
        using var created = await client.PostAsJsonAsync("/api/checks", new
        {
            name = "probe-label-only",
            componentId = "embed-internal-db",
            componentName = "Embed internal database",
            type = "tcp",
            intervalSeconds = 15,
            timeoutSeconds = 2,
            target = new { host = "10.0.0.8", port = 5432 }
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);

        using var anonymous = _factory.CreateClient();
        using var embed = await anonymous.GetAsync("/embed");
        Assert.Equal(HttpStatusCode.OK, embed.StatusCode);
        var html = await embed.Content.ReadAsStringAsync();
        Assert.Contains("data-status-embed", html);
        Assert.Contains("Microsoft Azure", html);
        Assert.Contains("All Systems Operational", html);
        Assert.DoesNotContain("Embed internal database", html);
        Assert.DoesNotContain("embed-internal-db", html);
        Assert.DoesNotContain("probe-label-only", html);
        Assert.DoesNotContain("10.0.0.8", html);
        Assert.DoesNotContain("5432", html);
        Assert.DoesNotContain("local-health", html);
        Assert.DoesNotContain("Local status page", html);
        Assert.DoesNotContain("latencyMs", html);
        Assert.DoesNotContain("consecutiveFailures", html);
        Assert.DoesNotContain("Subscribe", html, StringComparison.OrdinalIgnoreCase);

        using var script = await anonymous.GetAsync("/js/embed.js");
        Assert.Equal(HttpStatusCode.OK, script.StatusCode);
        var js = await script.Content.ReadAsStringAsync();
        Assert.Contains("/api/v2/summary.json", js);
        Assert.DoesNotContain("10.0.0.8", js);
        Assert.DoesNotContain("probe-label-only", js);
        Assert.DoesNotContain("error", js, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Rss_and_atom_omit_internal_only_incidents()
    {
        using var client = OperatorClient();
        using var internalOnly = await client.PostAsJsonAsync("/api/operator/incidents", new
        {
            name = "RSS internal-only warehouse outage",
            status = "investigating",
            impact = "major",
            body = "Internal leaf only.",
            componentIds = new[] { "local-health" }
        });
        Assert.Equal(HttpStatusCode.Created, internalOnly.StatusCode);

        using var mixed = await client.PostAsJsonAsync("/api/operator/incidents", new
        {
            name = "RSS mixed public and internal",
            status = "investigating",
            impact = "minor",
            body = "Public plus internal leaf.",
            componentIds = new[] { "azure-status", "local-health" }
        });
        Assert.Equal(HttpStatusCode.Created, mixed.StatusCode);

        using var publicOnly = await client.PostAsJsonAsync("/api/operator/incidents", new
        {
            name = "RSS public-only azure advisory",
            status = "investigating",
            impact = "minor",
            body = "Public leaf only.",
            componentIds = new[] { "azure-status" }
        });
        Assert.Equal(HttpStatusCode.Created, publicOnly.StatusCode);

        using var anonymous = _factory.CreateClient();
        using var incidentsJson = await anonymous.GetAsync("/api/v2/incidents.json");
        using var incidentsDoc = JsonDocument.Parse(await incidentsJson.Content.ReadAsStringAsync());
        var jsonNames = incidentsDoc.RootElement.GetProperty("incidents").EnumerateArray()
            .Select(i => i.GetProperty("name").GetString())
            .ToList();

        using var rssResponse = await anonymous.GetAsync("/incidents.rss");
        Assert.Equal(HttpStatusCode.OK, rssResponse.StatusCode);
        Assert.Contains("rss", rssResponse.Content.Headers.ContentType?.MediaType);
        var rss = await rssResponse.Content.ReadAsStringAsync();
        var rssDoc = XDocument.Parse(rss);
        var rssTitles = rssDoc.Descendants("item").Select(i => (string?)i.Element("title")).ToList();
        Assert.DoesNotContain("RSS internal-only warehouse outage", rssTitles);
        Assert.Contains("RSS mixed public and internal", rssTitles);
        Assert.Contains("RSS public-only azure advisory", rssTitles);
        Assert.Equal(jsonNames.Contains("RSS internal-only warehouse outage"), rssTitles.Contains("RSS internal-only warehouse outage"));
        Assert.DoesNotContain("local-health", rss);
        Assert.DoesNotContain("Local status page", rss);
        Assert.DoesNotContain("10.0.0.8", rss);

        using var atomResponse = await anonymous.GetAsync("/incidents.atom");
        Assert.Equal(HttpStatusCode.OK, atomResponse.StatusCode);
        Assert.Contains("atom", atomResponse.Content.Headers.ContentType?.MediaType);
        var atom = await atomResponse.Content.ReadAsStringAsync();
        XNamespace ns = "http://www.w3.org/2005/Atom";
        var atomDoc = XDocument.Parse(atom);
        var atomTitles = atomDoc.Descendants(ns + "entry").Select(e => (string?)e.Element(ns + "title")).ToList();
        Assert.DoesNotContain("RSS internal-only warehouse outage", atomTitles);
        Assert.Contains("RSS mixed public and internal", atomTitles);
        Assert.Contains("RSS public-only azure advisory", atomTitles);
        Assert.DoesNotContain("local-health", atom);
        Assert.DoesNotContain("Local status page", atom);
    }

    [Fact]
    public void Template_rules_reject_internal_component_ids()
    {
        var state = DemoSeed.Create("http://localhost:5080", DateTimeOffset.UtcNow);
        var store = new InMemoryStatusStore(state);
        store.CreateCheck(new CreateCheckRequest(
            "warehouse",
            "billing-warehouse",
            "tcp",
            true,
            15,
            5,
            3,
            2,
            new CheckTargetSpec { Host = "10.0.0.9", Port = 5432 },
            null,
            "Billing warehouse"));

        var ex = Assert.Throws<ArgumentException>(() =>
            IncidentTemplateRules.NormalizePublicComponentIds(["billing-warehouse"], store));
        Assert.Contains("internal", ex.Message, StringComparison.OrdinalIgnoreCase);

        var publicIds = IncidentTemplateRules.NormalizePublicComponentIds(["azure-status"], store);
        Assert.Equal(["azure-status"], publicIds);
    }

    [Fact]
    public async Task Operator_templates_reject_internal_ids_and_apply_prefill()
    {
        using var anonymous = _factory.CreateClient();
        using var denied = await anonymous.PostAsJsonAsync("/api/operator/templates", new
        {
            title = "should 401",
            impact = "minor",
            componentIds = new[] { "azure-status" }
        });
        Assert.Equal(HttpStatusCode.Unauthorized, denied.StatusCode);

        using var client = OperatorClient();
        using var rejected = await client.PostAsJsonAsync("/api/operator/templates", new
        {
            title = "Internal warehouse",
            impact = "major",
            componentIds = new[] { "local-health" }
        });
        Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);
        using var rejectedDoc = JsonDocument.Parse(await rejected.Content.ReadAsStringAsync());
        Assert.Contains("internal", rejectedDoc.RootElement.GetProperty("error").GetString(), StringComparison.OrdinalIgnoreCase);

        using var created = await client.PostAsJsonAsync("/api/operator/templates", new
        {
            title = "Azure regional advisory",
            impact = "minor",
            componentIds = new[] { "azure-status" }
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        using var createdDoc = JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        var id = createdDoc.RootElement.GetProperty("id").GetString();
        Assert.False(string.IsNullOrWhiteSpace(id));
        Assert.Equal("Azure regional advisory", createdDoc.RootElement.GetProperty("title").GetString());
        Assert.Equal("minor", createdDoc.RootElement.GetProperty("impact").GetString());
        Assert.Equal("azure-status", createdDoc.RootElement.GetProperty("componentIds")[0].GetString());

        using var updateRejected = await client.PutAsJsonAsync($"/api/operator/templates/{id}", new
        {
            title = "Azure regional advisory",
            impact = "minor",
            componentIds = new[] { "azure-status", "local-health" }
        });
        Assert.Equal(HttpStatusCode.BadRequest, updateRejected.StatusCode);

        using var apply = await client.GetAsync($"/api/operator/templates/{id}");
        Assert.Equal(HttpStatusCode.OK, apply.StatusCode);
        using var applyDoc = JsonDocument.Parse(await apply.Content.ReadAsStringAsync());
        Assert.Equal("Azure regional advisory", applyDoc.RootElement.GetProperty("title").GetString());
        Assert.DoesNotContain(applyDoc.RootElement.GetProperty("componentIds").EnumerateArray(),
            c => c.GetString() == "local-health");

        using var page = await client.GetAsync($"/operator?applyTemplate={id}");
        Assert.Equal(HttpStatusCode.OK, page.StatusCode);
        var html = await page.Content.ReadAsStringAsync();
        Assert.Contains("value=\"Azure regional advisory\"", html);
        Assert.Contains("value=\"minor\"", html);
        Assert.Contains("value=\"azure-status\"", html);
        Assert.Contains("incident-create-form", html);
        Assert.DoesNotContain("local-health", html.Split("id=\"incident-create-form\"")[1].Split("</form>")[0]);

        using var deleted = await client.DeleteAsync($"/api/operator/templates/{id}");
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
    }

    [Fact]
    public void Public_feeds_match_incidents_json_visibility()
    {
        var state = DemoSeed.Create("http://localhost:5080", DateTimeOffset.UtcNow);
        state.Checks.Clear();
        var store = new InMemoryStatusStore(state);
        store.CreateCheck(new CreateCheckRequest(
            "warehouse",
            "billing-warehouse",
            "tcp",
            true,
            15,
            5,
            3,
            2,
            new CheckTargetSpec { Host = "10.0.0.9", Port = 5432 },
            null,
            "Billing warehouse"));
        store.CreateIncident(new CreateIncidentRequest(
            "Internal-only feed incident",
            "investigating",
            "major",
            "Hidden from public feeds.",
            ["billing-warehouse"],
            null,
            null), false);
        store.CreateIncident(new CreateIncidentRequest(
            "Public feed incident",
            "investigating",
            "minor",
            "Visible on public feeds.",
            ["azure-status"],
            null,
            null), false);

        var publicState = PublicApiMapper.ForPublic(store);
        var rss = PublicFeeds.Rss(publicState);
        var atom = PublicFeeds.Atom(publicState);
        Assert.DoesNotContain("Internal-only feed incident", rss);
        Assert.DoesNotContain("Internal-only feed incident", atom);
        Assert.Contains("Public feed incident", rss);
        Assert.Contains("Public feed incident", atom);
        Assert.DoesNotContain("billing-warehouse", rss);
        Assert.DoesNotContain("Billing warehouse", atom);
    }

    private HttpClient OperatorClient()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Api-Key", "dev-key");
        return client;
    }
}
