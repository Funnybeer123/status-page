using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using StatusPage.Api;
using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Tests;

public class CheckMuteTests : IClassFixture<StatusPageFactory>
{
    private readonly StatusPageFactory _factory;

    public CheckMuteTests(StatusPageFactory factory) => _factory = factory;

    [Fact]
    public async Task Worker_does_not_probe_muted_check()
    {
        var store = EmptyStore();
        store.CreateCheck(Check("muted-probe", "azure-status"));
        store.CreateCheck(Check("open-probe", "github-status"));
        var mutedId = store.ListChecks().Single(c => c.Name == "muted-probe").Id;
        var now = DateTimeOffset.UtcNow;
        store.PatchCheck(mutedId, Mute(now.AddMinutes(-10), now.AddMinutes(10)));

        var worker = new CheckWorker(store, CreateRunner(), NullLogger<CheckWorker>.Instance);
        await worker.RunDueAsync(CancellationToken.None);

        var muted = store.FindCheck(mutedId)!;
        var open = store.ListChecks().Single(c => c.Name == "open-probe");
        Assert.Null(muted.LastResult);
        Assert.Equal(0, muted.ConsecutiveFailures);
        Assert.Equal(CheckState.Up, muted.State);
        Assert.NotNull(open.LastResult);
        Assert.Equal(ComponentStatus.Operational, store.FindComponent("azure-status")!.Status);
        Assert.NotEqual(ComponentStatus.UnderMaintenance, store.FindComponent("azure-status")!.Status);
    }

    [Fact]
    public void Auto_incident_does_not_open_while_muted()
    {
        var store = EmptyStore();
        store.CreateCheck(Check("muted-probe", "azure-status"));
        var id = store.ListChecks().Single(c => c.Name == "muted-probe").Id;
        var now = DateTimeOffset.UtcNow;
        store.PatchCheck(id, Mute(now.AddHours(-1), now.AddHours(1)));

        for (var i = 0; i < 3; i++)
        {
            store.RecordCheckResult(id, new CheckResult
            {
                Status = CheckResultStatus.Fail,
                Error = "fail",
                CheckedAtUtc = DateTimeOffset.UtcNow
            });
        }

        var check = store.FindCheck(id)!;
        Assert.Null(check.LastResult);
        Assert.Equal(CheckState.Up, check.State);
        Assert.Equal(0, check.ConsecutiveFailures);
        Assert.Equal(ComponentStatus.Operational, store.FindComponent("azure-status")!.Status);
        Assert.DoesNotContain(store.Snapshot().Incidents, i => i.AutoFromChecks);
        Assert.NotEqual(ComponentStatus.UnderMaintenance, store.FindComponent("azure-status")!.Status);
    }

    [Fact]
    public async Task Patch_sets_and_clears_mute_window()
    {
        using var client = OperatorClient();
        using var created = await client.PostAsJsonAsync("/api/checks", new
        {
            name = "mute-patch-probe",
            componentId = "mute-patch-leaf",
            componentName = "Mute patch leaf",
            type = "tcp",
            intervalSeconds = 15,
            timeoutSeconds = 2,
            target = new { host = "127.0.0.1", port = 9 }
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        using var createdDoc = JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        var id = createdDoc.RootElement.GetProperty("id").GetString();
        Assert.False(string.IsNullOrWhiteSpace(id));

        var from = new DateTimeOffset(2026, 8, 23, 16, 0, 0, TimeSpan.Zero);
        var until = new DateTimeOffset(2026, 8, 23, 18, 0, 0, TimeSpan.Zero);
        using var set = await client.PatchAsJsonAsync($"/api/checks/{id}", new
        {
            mutedFrom = from,
            mutedUntil = until
        });
        Assert.Equal(HttpStatusCode.OK, set.StatusCode);
        using var setDoc = JsonDocument.Parse(await set.Content.ReadAsStringAsync());
        Assert.Equal("2026-08-23T16:00:00.000Z", setDoc.RootElement.GetProperty("mutedFrom").GetString());
        Assert.Equal("2026-08-23T18:00:00.000Z", setDoc.RootElement.GetProperty("mutedUntil").GetString());

        using var cleared = await client.PatchAsJsonAsync($"/api/checks/{id}", new
        {
            mutedFrom = (DateTimeOffset?)null,
            mutedUntil = (DateTimeOffset?)null
        });
        Assert.Equal(HttpStatusCode.OK, cleared.StatusCode);
        using var clearedDoc = JsonDocument.Parse(await cleared.Content.ReadAsStringAsync());
        Assert.Equal(JsonValueKind.Null, clearedDoc.RootElement.GetProperty("mutedFrom").ValueKind);
        Assert.Equal(JsonValueKind.Null, clearedDoc.RootElement.GetProperty("mutedUntil").ValueKind);
        Assert.False(clearedDoc.RootElement.GetProperty("muted").GetBoolean());
    }

    [Fact]
    public async Task Run_during_active_mute_returns_409_not_a_fail()
    {
        using var client = OperatorClient();
        using var created = await client.PostAsJsonAsync("/api/checks", new
        {
            name = "mute-run-probe",
            componentId = "mute-run-leaf",
            componentName = "Mute run leaf",
            type = "tcp",
            intervalSeconds = 15,
            timeoutSeconds = 2,
            target = new { host = "127.0.0.1", port = 9 }
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        using var createdDoc = JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        var id = createdDoc.RootElement.GetProperty("id").GetString();
        Assert.False(string.IsNullOrWhiteSpace(id));

        var now = DateTimeOffset.UtcNow;
        using var muted = await client.PatchAsJsonAsync($"/api/checks/{id}", new
        {
            mutedFrom = now.AddMinutes(-5),
            mutedUntil = now.AddMinutes(30)
        });
        Assert.Equal(HttpStatusCode.OK, muted.StatusCode);

        using var run = await client.PostAsJsonAsync($"/api/checks/{id}/run", new { });
        Assert.Equal(HttpStatusCode.Conflict, run.StatusCode);
        using var runDoc = JsonDocument.Parse(await run.Content.ReadAsStringAsync());
        Assert.True(runDoc.RootElement.GetProperty("muted").GetBoolean());
        Assert.Contains("muted", runDoc.RootElement.GetProperty("error").GetString(), StringComparison.OrdinalIgnoreCase);
        Assert.False(runDoc.RootElement.TryGetProperty("result", out _));

        using var got = await client.GetAsync($"/api/checks/{id}");
        using var gotDoc = JsonDocument.Parse(await got.Content.ReadAsStringAsync());
        Assert.Equal(JsonValueKind.Null, gotDoc.RootElement.GetProperty("lastResult").ValueKind);
        Assert.Equal(0, gotDoc.RootElement.GetProperty("consecutiveFailures").GetInt32());
        Assert.Equal("Up", gotDoc.RootElement.GetProperty("state").GetString());

        using var components = await client.GetAsync("/api/operator/components");
        using var componentsDoc = JsonDocument.Parse(await components.Content.ReadAsStringAsync());
        var leaf = componentsDoc.RootElement.EnumerateArray().Single(c => c.GetProperty("id").GetString() == "mute-run-leaf");
        Assert.Equal("operational", leaf.GetProperty("status").GetString());
        Assert.NotEqual("under_maintenance", leaf.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Ics_omits_internal_only_scheduled_maintenance()
    {
        using var client = OperatorClient();
        using var internalOnly = await client.PostAsJsonAsync("/api/operator/incidents", new
        {
            name = "ICS internal-only warehouse window",
            status = "scheduled",
            impact = "maintenance",
            body = "Internal leaf only.",
            maintenance = true,
            componentIds = new[] { "local-health" },
            scheduledFor = DateTimeOffset.UtcNow.AddHours(2),
            scheduledUntil = DateTimeOffset.UtcNow.AddHours(3)
        });
        Assert.Equal(HttpStatusCode.Created, internalOnly.StatusCode);

        using var publicWindow = await client.PostAsJsonAsync("/api/operator/incidents", new
        {
            name = "ICS public azure maintenance",
            status = "scheduled",
            impact = "maintenance",
            body = "Public leaf only.",
            maintenance = true,
            componentIds = new[] { "azure-status" },
            scheduledFor = DateTimeOffset.UtcNow.AddHours(4),
            scheduledUntil = DateTimeOffset.UtcNow.AddHours(5)
        });
        Assert.Equal(HttpStatusCode.Created, publicWindow.StatusCode);

        using var anonymous = _factory.CreateClient();
        using var icsResponse = await anonymous.GetAsync("/maintenance.ics");
        Assert.Equal(HttpStatusCode.OK, icsResponse.StatusCode);
        Assert.Contains("text/calendar", icsResponse.Content.Headers.ContentType?.MediaType);
        var ics = await icsResponse.Content.ReadAsStringAsync();
        Assert.Contains("BEGIN:VCALENDAR", ics);
        Assert.Contains("BEGIN:VEVENT", ics);
        Assert.Contains("ICS public azure maintenance", ics);
        Assert.DoesNotContain("ICS internal-only warehouse window", ics);
        Assert.DoesNotContain("local-health", ics);
        Assert.DoesNotContain("Local status page", ics);

        using var scheduled = await anonymous.GetAsync("/api/v2/scheduled-maintenances.json");
        using var scheduledDoc = JsonDocument.Parse(await scheduled.Content.ReadAsStringAsync());
        var names = scheduledDoc.RootElement.GetProperty("scheduled_maintenances").EnumerateArray()
            .Select(i => i.GetProperty("name").GetString())
            .ToList();
        Assert.Contains("ICS public azure maintenance", names);
        Assert.DoesNotContain("ICS internal-only warehouse window", names);
    }

    [Fact]
    public async Task Operator_ui_shows_mute_window_and_public_page_is_not_maintenance()
    {
        using var client = OperatorClient();
        using var created = await client.PostAsJsonAsync("/api/checks", new
        {
            name = "mute-ui-probe",
            componentId = "github-status",
            type = "tcp",
            intervalSeconds = 15,
            timeoutSeconds = 2,
            target = new { host = "127.0.0.1", port = 9 }
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        using var createdDoc = JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        var id = createdDoc.RootElement.GetProperty("id").GetString();
        var from = DateTimeOffset.UtcNow.AddMinutes(-1);
        var until = DateTimeOffset.UtcNow.AddHours(2);
        using var muted = await client.PatchAsJsonAsync($"/api/checks/{id}", new
        {
            mutedFrom = from,
            mutedUntil = until
        });
        Assert.Equal(HttpStatusCode.OK, muted.StatusCode);

        using var operatorPage = await client.GetAsync("/operator");
        var html = await operatorPage.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, operatorPage.StatusCode);
        Assert.Contains("Next mute window", html);
        Assert.Contains("mute-ui-probe", html);
        Assert.Contains("Muted now", html);
        Assert.Contains("Set mute", html);
        Assert.Contains("Clear mute", html);
        Assert.Contains("check-admin-muted", html);
        Assert.DoesNotContain("asp-page-handler=\"UpdateCheck\"", html);

        var jsPath = Path.Combine(FindRepoRoot(), "src", "StatusPage", "wwwroot", "js", "operator-checks.js");
        var js = await File.ReadAllTextAsync(jsPath);
        Assert.Contains("409", js);
        Assert.Contains("MutedError", js);
        Assert.Contains("showMuted", js);

        using var anonymous = _factory.CreateClient();
        using var home = await anonymous.GetAsync("/");
        var publicHtml = await home.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, home.StatusCode);
        Assert.DoesNotContain("Next mute window", publicHtml);
        Assert.DoesNotContain("mute-ui-probe", publicHtml);
        Assert.DoesNotContain("Set mute", publicHtml);
        Assert.Contains("CURRENT STATUS", publicHtml);
        Assert.DoesNotContain("Under Maintenance", publicHtml);

        using var status = await anonymous.GetAsync("/api/v2/status.json");
        using var statusDoc = JsonDocument.Parse(await status.Content.ReadAsStringAsync());
        Assert.Equal("none", statusDoc.RootElement.GetProperty("status").GetProperty("indicator").GetString());
        Assert.Equal("All Systems Operational", statusDoc.RootElement.GetProperty("status").GetProperty("description").GetString());
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

    private static CreateCheckRequest Check(string name, string componentId) => new(
        name,
        componentId,
        "tcp",
        true,
        15,
        5,
        3,
        2,
        new CheckTargetSpec { Host = "127.0.0.1", Port = 9 },
        null);

    private static PatchCheckRequest Mute(DateTimeOffset from, DateTimeOffset until) =>
        new(null, null, null, null, null, null, null, null, null, null, from, true, until, true);

    private static CheckRunner CreateRunner()
    {
        var services = new ServiceCollection();
        services.AddHttpClient("StatusChecks");
        var factory = services.BuildServiceProvider().GetRequiredService<IHttpClientFactory>();
        return new CheckRunner(factory, NullLogger<CheckRunner>.Instance);
    }

    private static string FindRepoRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            if (File.Exists(Path.Combine(dir.FullName, "src", "StatusPage", "wwwroot", "js", "operator-checks.js")))
            {
                return dir.FullName;
            }

            dir = dir.Parent;
        }

        throw new DirectoryNotFoundException("Could not find repo root from " + AppContext.BaseDirectory);
    }
}
