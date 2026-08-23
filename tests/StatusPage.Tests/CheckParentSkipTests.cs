using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using StatusPage.Api;
using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Tests;

public class CheckParentSkipTests : IClassFixture<StatusPageFactory>
{
    private readonly StatusPageFactory _factory;

    public CheckParentSkipTests(StatusPageFactory factory) => _factory = factory;

    [Fact]
    public async Task Worker_does_not_probe_child_when_parent_leaf_is_down()
    {
        var store = EmptyStore();
        store.CreateCheck(Check("parent-probe", "azure-status"));
        store.CreateCheck(Check("child-probe", "child-skip-leaf", "Child skip leaf", "azure-status"));
        var parentId = store.ListChecks().Single(c => c.Name == "parent-probe").Id;
        var childId = store.ListChecks().Single(c => c.Name == "child-probe").Id;
        Fail(store, parentId, 3);

        Assert.Equal(CheckState.Down, store.FindCheck(parentId)!.State);
        Assert.Equal(ComponentStatus.MajorOutage, store.FindComponent("azure-status")!.Status);

        var worker = new CheckWorker(store, CreateRunner(), NullLogger<CheckWorker>.Instance);
        await worker.RunDueAsync(CancellationToken.None);

        var child = store.FindCheck(childId)!;
        Assert.Null(child.LastResult);
        Assert.Equal(0, child.ConsecutiveFailures);
        Assert.Equal(CheckState.Up, child.State);
        Assert.Equal(ComponentStatus.Operational, store.FindComponent("child-skip-leaf")!.Status);
    }

    [Fact]
    public void Auto_incident_does_not_open_on_child_when_parent_is_down()
    {
        var store = EmptyStore();
        store.CreateCheck(Check("parent-probe", "github-status"));
        store.CreateCheck(Check("child-probe", "child-incident-leaf", "Child incident leaf", "github-status"));
        var parentId = store.ListChecks().Single(c => c.Name == "parent-probe").Id;
        var childId = store.ListChecks().Single(c => c.Name == "child-probe").Id;
        Fail(store, parentId, 3);

        for (var i = 0; i < 3; i++)
        {
            store.RecordCheckResult(childId, new CheckResult
            {
                Status = CheckResultStatus.Fail,
                Error = "fail",
                CheckedAtUtc = DateTimeOffset.UtcNow
            });
        }

        var child = store.FindCheck(childId)!;
        Assert.Null(child.LastResult);
        Assert.Equal(CheckState.Up, child.State);
        Assert.Equal(0, child.ConsecutiveFailures);
        Assert.Equal(ComponentStatus.Operational, store.FindComponent("child-incident-leaf")!.Status);
        Assert.DoesNotContain(
            store.Snapshot().Incidents,
            i => i.AutoFromChecks && i.ComponentIds.Contains("child-incident-leaf"));
        Assert.Contains(
            store.Snapshot().Incidents,
            i => i.AutoFromChecks && i.ComponentIds.Contains("github-status"));
    }

    [Fact]
    public void Groups_do_not_probe_and_do_not_skip_sibling_leaves()
    {
        var store = EmptyStore();
        store.CreateCheck(Check("azure-probe", "azure-status"));
        store.CreateCheck(Check("ado-probe", "azure-devops-status"));
        var azureId = store.ListChecks().Single(c => c.Name == "azure-probe").Id;
        Fail(store, azureId, 3);

        Assert.Throws<ArgumentException>(() => store.CreateCheck(Check(
            "group-probe",
            "cloud-cost-agent",
            "Group should not get a check")));
        Assert.DoesNotContain(store.ListChecks(), c => c.ComponentId == "cloud-cost-agent");

        var workerDue = store.ListChecks()
            .Where(c => c.Enabled)
            .Where(c => !CheckParentSkip.IsActive(c, store.Snapshot().Components, store.ListChecks()))
            .Select(c => c.Name)
            .ToList();
        Assert.Contains("ado-probe", workerDue);
        Assert.False(CheckParentSkip.IsActive(
            store.ListChecks().Single(c => c.Name == "ado-probe"),
            store.Snapshot().Components,
            store.ListChecks()));
    }

    [Fact]
    public async Task Run_on_skipped_child_returns_409_parent_down_not_a_fail()
    {
        using var client = OperatorClient();
        using var parentCreated = await client.PostAsJsonAsync("/api/checks", new
        {
            name = "parent-run-probe",
            componentId = "parent-run-leaf",
            componentName = "Parent run leaf",
            type = "tcp",
            intervalSeconds = 15,
            timeoutSeconds = 2,
            target = new { host = "127.0.0.1", port = 9 }
        });
        Assert.Equal(HttpStatusCode.Created, parentCreated.StatusCode);
        using var parentDoc = JsonDocument.Parse(await parentCreated.Content.ReadAsStringAsync());
        var parentCheckId = parentDoc.RootElement.GetProperty("id").GetString();
        Assert.False(string.IsNullOrWhiteSpace(parentCheckId));

        using var childCreated = await client.PostAsJsonAsync("/api/checks", new
        {
            name = "child-run-probe",
            componentId = "child-run-leaf",
            componentName = "Child run leaf",
            parentId = "parent-run-leaf",
            type = "tcp",
            intervalSeconds = 15,
            timeoutSeconds = 2,
            target = new { host = "127.0.0.1", port = 9 }
        });
        Assert.Equal(HttpStatusCode.Created, childCreated.StatusCode);
        using var childDoc = JsonDocument.Parse(await childCreated.Content.ReadAsStringAsync());
        var childCheckId = childDoc.RootElement.GetProperty("id").GetString();
        Assert.Equal("parent-run-leaf", childDoc.RootElement.GetProperty("parentId").GetString());

        var store = _factory.Services.GetRequiredService<IStatusStore>();
        Fail(store, parentCheckId!, 3);

        using var run = await client.PostAsJsonAsync($"/api/checks/{childCheckId}/run", new { });
        Assert.Equal(HttpStatusCode.Conflict, run.StatusCode);
        using var runDoc = JsonDocument.Parse(await run.Content.ReadAsStringAsync());
        Assert.True(runDoc.RootElement.GetProperty("parentDown").GetBoolean());
        Assert.Equal("parent-run-leaf", runDoc.RootElement.GetProperty("parentId").GetString());
        Assert.Contains("parent", runDoc.RootElement.GetProperty("error").GetString(), StringComparison.OrdinalIgnoreCase);
        Assert.False(runDoc.RootElement.TryGetProperty("result", out _));

        using var got = await client.GetAsync($"/api/checks/{childCheckId}");
        using var gotDoc = JsonDocument.Parse(await got.Content.ReadAsStringAsync());
        Assert.Equal(JsonValueKind.Null, gotDoc.RootElement.GetProperty("lastResult").ValueKind);
        Assert.Equal(0, gotDoc.RootElement.GetProperty("consecutiveFailures").GetInt32());
        Assert.Equal("Up", gotDoc.RootElement.GetProperty("state").GetString());
    }

    [Fact]
    public async Task Public_page_does_not_show_invented_child_outage()
    {
        using var client = OperatorClient();
        using var parentCreated = await client.PostAsJsonAsync("/api/checks", new
        {
            name = "parent-public-probe",
            componentId = "parent-public-leaf",
            componentName = "Parent public leaf",
            type = "https",
            intervalSeconds = 15,
            timeoutSeconds = 2,
            target = new { url = "https://www.githubstatus.com/api/v2/status.json" },
            http = new { expectedStatus = new[] { 200 } }
        });
        Assert.Equal(HttpStatusCode.Created, parentCreated.StatusCode);
        using var parentDoc = JsonDocument.Parse(await parentCreated.Content.ReadAsStringAsync());
        var parentCheckId = parentDoc.RootElement.GetProperty("id").GetString();

        using var childCreated = await client.PostAsJsonAsync("/api/checks", new
        {
            name = "child-public-probe",
            componentId = "child-public-leaf",
            componentName = "Child public leaf",
            parentId = "parent-public-leaf",
            type = "https",
            intervalSeconds = 15,
            timeoutSeconds = 2,
            target = new { url = "https://www.githubstatus.com/api/v2/status.json" },
            http = new { expectedStatus = new[] { 200 } }
        });
        Assert.Equal(HttpStatusCode.Created, childCreated.StatusCode);

        var store = _factory.Services.GetRequiredService<IStatusStore>();
        Fail(store, parentCheckId!, 3);
        var childCheckId = store.ListChecks().Single(c => c.Name == "child-public-probe").Id;
        Fail(store, childCheckId, 3);

        Assert.Equal(ComponentStatus.Operational, store.FindComponent("child-public-leaf")!.Status);
        Assert.DoesNotContain(
            store.Snapshot().Incidents,
            i => i.AutoFromChecks && i.ComponentIds.Contains("child-public-leaf"));

        using var anonymous = _factory.CreateClient();
        using var home = await anonymous.GetAsync("/");
        var publicHtml = await home.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, home.StatusCode);
        Assert.Contains("Child public leaf", publicHtml);
        Assert.DoesNotContain("Child public leaf checks failing", publicHtml);
        Assert.DoesNotContain("child-public-probe", publicHtml);

        using var summary = await anonymous.GetAsync("/api/v2/summary.json");
        using var summaryDoc = JsonDocument.Parse(await summary.Content.ReadAsStringAsync());
        var child = summaryDoc.RootElement.GetProperty("components").EnumerateArray()
            .Single(c => c.GetProperty("id").GetString() == "child-public-leaf");
        Assert.Equal("operational", child.GetProperty("status").GetString());
        var incidentNames = summaryDoc.RootElement.GetProperty("incidents").EnumerateArray()
            .Select(i => i.GetProperty("name").GetString())
            .ToList();
        Assert.DoesNotContain("Child public leaf checks failing", incidentNames);
    }

    private HttpClient OperatorClient()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Api-Key", "dev-key");
        return client;
    }

    private static InMemoryStatusStore EmptyStore()
    {
        var state = DemoSeed.Create("http://localhost:5080", DateTimeOffset.UtcNow);
        state.Checks.Clear();
        return new InMemoryStatusStore(state);
    }

    private static CreateCheckRequest Check(
        string name,
        string componentId,
        string? componentName = null,
        string? parentId = null) => new(
        name,
        componentId,
        "tcp",
        true,
        15,
        5,
        3,
        2,
        new CheckTargetSpec { Host = "127.0.0.1", Port = 9 },
        null,
        componentName,
        null,
        null,
        null,
        parentId);

    private static void Fail(IStatusStore store, string checkId, int times)
    {
        for (var i = 0; i < times; i++)
        {
            store.RecordCheckResult(checkId, new CheckResult
            {
                Status = CheckResultStatus.Fail,
                Error = "fail",
                CheckedAtUtc = DateTimeOffset.UtcNow
            });
        }
    }

    private static CheckRunner CreateRunner()
    {
        var services = new ServiceCollection();
        services.AddHttpClient("StatusChecks");
        var factory = services.BuildServiceProvider().GetRequiredService<IHttpClientFactory>();
        return new CheckRunner(factory, NullLogger<CheckRunner>.Instance);
    }
}
