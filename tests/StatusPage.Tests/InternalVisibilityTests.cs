using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Tests;

public class InternalVisibilityTests : IClassFixture<StatusPageFactory>
{
    private readonly StatusPageFactory _factory;

    public InternalVisibilityTests(StatusPageFactory factory) => _factory = factory;

    [Fact]
    public void Loopback_and_rfc1918_are_internal()
    {
        Assert.True(InternalHost.IsInternalHost("127.0.0.1"));
        Assert.True(InternalHost.IsInternalHost("localhost"));
        Assert.True(InternalHost.IsInternalHost("10.0.0.5"));
        Assert.True(InternalHost.IsInternalHost("192.168.1.9"));
        Assert.True(InternalHost.IsInternalHost("db.internal"));
        Assert.False(InternalHost.IsInternalHost("azure.status.microsoft"));
        Assert.False(InternalHost.IsInternalHost("www.githubstatus.com"));
    }

    [Fact]
    public void Store_marks_host_port_leaf_internal()
    {
        var state = DemoSeed.Create("http://localhost:5080", DateTimeOffset.UtcNow);
        state.Checks.Clear();
        var store = new InMemoryStatusStore(state);
        store.CreateCheck(new CreateCheckRequest(
            "probe-label-only",
            "billing-warehouse",
            "tcp",
            true,
            15,
            5,
            3,
            2,
            new CheckTargetSpec { Host = "127.0.0.1", Port = 9 },
            null,
            "Billing warehouse"));
        var leaf = store.FindComponent("billing-warehouse")!;
        Assert.True(ComponentVisibility.IsInternalLeaf(leaf, store.ListChecks()));

        var publicState = store.Snapshot();
        ComponentVisibility.RemoveInternal(publicState, store.ListChecks());
        Assert.DoesNotContain(publicState.Components, c => c.Id == "billing-warehouse");
    }

    [Fact]
    public async Task Anonymous_public_api_hides_internal_host_port_leaf()
    {
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Api-Key", "dev-key");
        using var created = await client.PostAsync("/api/checks", JsonContent.Create(new
        {
            name = "probe-label-only",
            componentId = "internal-db",
            componentName = "Internal database",
            type = "tcp",
            intervalSeconds = 15,
            timeoutSeconds = 2,
            target = new { host = "10.0.0.8", port = 5432 }
        }));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);

        using var anonymous = _factory.CreateClient();
        using var summary = await anonymous.GetAsync("/api/v2/summary.json");
        using var doc = JsonDocument.Parse(await summary.Content.ReadAsStringAsync());
        var ids = doc.RootElement.GetProperty("components").EnumerateArray().Select(c => c.GetProperty("id").GetString()).ToList();
        Assert.DoesNotContain("internal-db", ids);
        Assert.Contains("azure-status", ids);

        using var home = await anonymous.GetAsync("/");
        var html = await home.Content.ReadAsStringAsync();
        Assert.DoesNotContain("Internal database", html);
        Assert.Contains("Microsoft Azure", html);

        using var operatorComponents = await client.GetAsync("/api/operator/components");
        using var opDoc = JsonDocument.Parse(await operatorComponents.Content.ReadAsStringAsync());
        Assert.Contains(opDoc.RootElement.EnumerateArray(), c => c.GetProperty("id").GetString() == "internal-db" && c.GetProperty("internal").GetBoolean());
    }

    [Fact]
    public void Disabled_internal_check_stays_off_public_page()
    {
        var state = DemoSeed.Create("http://localhost:5080", DateTimeOffset.UtcNow);
        state.Checks.Clear();
        var store = new InMemoryStatusStore(state);
        var check = store.CreateCheck(new CreateCheckRequest(
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
        store.SetCheckEnabled(check.Id, false);
        var leaf = store.FindComponent("billing-warehouse")!;
        Assert.True(ComponentVisibility.IsInternalLeaf(leaf, store.ListChecks()));

        var publicState = store.Snapshot();
        ComponentVisibility.RemoveInternal(publicState, store.ListChecks());
        Assert.DoesNotContain(publicState.Components, c => c.Id == "billing-warehouse");
    }
}
