using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using StatusPage.Api;
using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Tests;

public class PublicUptimeTests
{

    [Fact]
    public void No_sample_has_no_percent()
    {
        var now = new DateTimeOffset(2026, 8, 23, 12, 0, 0, TimeSpan.Zero);
        var state = DemoSeed.Create("http://localhost:5080", now);
        state.Checks =
        [
            PublicCheck("chk-pub", "azure-status"),
            InternalCheck("chk-int", "local-health")
        ];
        var store = new InMemoryStatusStore(state);
        var publicState = PublicApiMapper.ForPublic(store);
        var leaves = PublicUptime.ForPublicLeaves(publicState, store.ListChecks(), [], now);

        var azure = Assert.Single(leaves, l => l.Id == "azure-status");
        Assert.Null(azure.UptimePercent);
        Assert.Equal(0, azure.Ok);
        Assert.Equal(0, azure.Fail);
        Assert.Equal(15, azure.Days.Count);
        Assert.All(azure.Days, day => Assert.False(day.HasSamples));
        Assert.Null(PublicUptime.FormatPercent(azure.UptimePercent));
        Assert.DoesNotContain(leaves, l => l.Id == "local-health");
        Assert.Null(PublicUptime.Percent(0, 0));
    }

    [Fact]
    public void Internal_samples_are_omitted()
    {
        var now = new DateTimeOffset(2026, 8, 23, 12, 0, 0, TimeSpan.Zero);
        var state = DemoSeed.Create("http://localhost:5080", now);
        state.Checks =
        [
            PublicCheck("chk-pub", "azure-status"),
            InternalCheck("chk-int", "local-health")
        ];
        var store = new InMemoryStatusStore(state);
        var samples = new[]
        {
            Sample("chk-pub", CheckResultStatus.Ok, now),
            Sample("chk-pub", CheckResultStatus.Fail, now),
            Sample("chk-int", CheckResultStatus.Fail, now),
            Sample("chk-int", CheckResultStatus.Fail, now)
        };
        var publicState = PublicApiMapper.ForPublic(store);
        var leaves = PublicUptime.ForPublicLeaves(publicState, store.ListChecks(), samples, now);

        Assert.DoesNotContain(leaves, l => l.Id == "local-health");
        var azure = Assert.Single(leaves, l => l.Id == "azure-status");
        Assert.Equal(1, azure.Ok);
        Assert.Equal(1, azure.Fail);
        Assert.Equal(50.0, azure.UptimePercent);
        Assert.True(PublicUptime.DayFailed(samples, store.ListChecks(), DateOnly.FromDateTime(now.UtcDateTime)));
        Assert.True(PublicUptime.DayHasSamples(samples, store.ListChecks(), DateOnly.FromDateTime(now.UtcDateTime)));
    }

    [Fact]
    public void Muted_window_does_not_add_oks()
    {
        var now = new DateTimeOffset(2026, 8, 23, 12, 0, 0, TimeSpan.Zero);
        var results = new CheckResultStore(Path.Combine(Path.GetTempPath(), $"uptime-mute-{Guid.NewGuid():N}.json"));
        var state = DemoSeed.Create("http://localhost:5080", now);
        state.Checks = [PublicCheck("chk-pub", "azure-status")];
        var store = new InMemoryStatusStore(state, persistChecks: null, persistPage: null, results);
        store.RecordCheckResult("chk-pub", new CheckResult
        {
            Status = CheckResultStatus.Fail,
            Error = "HTTP 503",
            CheckedAtUtc = now.AddHours(-2)
        });
        store.PatchCheck("chk-pub", new PatchCheckRequest(
            null, null, null, null, null, null, null, null, null, null,
            now.AddHours(-1), true, now.AddHours(2), true));
        store.RecordCheckResult("chk-pub", new CheckResult
        {
            Status = CheckResultStatus.Ok,
            CheckedAtUtc = now
        });

        var publicState = PublicApiMapper.ForPublic(store);
        var leaves = PublicUptime.ForPublicLeaves(publicState, store.ListChecks(), results.List(), now);
        var azure = Assert.Single(leaves, l => l.Id == "azure-status");
        Assert.Equal(0, azure.Ok);
        Assert.Equal(1, azure.Fail);
        Assert.Equal(0.0, azure.UptimePercent);
        Assert.NotEqual(100.0, azure.UptimePercent);
        Assert.Equal("0.0%", PublicUptime.FormatPercent(azure.UptimePercent));
        Assert.DoesNotContain(results.List(), s => s.ResultStatus == CheckResultStatus.Ok);
    }

    [Fact]
    public void Disabled_public_check_samples_do_not_count()
    {
        var now = new DateTimeOffset(2026, 8, 23, 12, 0, 0, TimeSpan.Zero);
        var state = DemoSeed.Create("http://localhost:5080", now);
        var check = PublicCheck("chk-pub", "azure-status");
        check.Enabled = false;
        state.Checks = [check];
        var store = new InMemoryStatusStore(state);
        var samples = new[] { Sample("chk-pub", CheckResultStatus.Ok, now) };
        var leaves = PublicUptime.ForPublicLeaves(PublicApiMapper.ForPublic(store), store.ListChecks(), samples, now);
        var azure = Assert.Single(leaves, l => l.Id == "azure-status");
        Assert.Null(azure.UptimePercent);
        Assert.False(azure.Days[0].HasSamples);
    }

    [Fact]
    public async Task Api_home_and_embed_omit_percent_without_samples()
    {
        using var factory = new StatusPageFactory();
        using var client = factory.CreateClient();
        using var api = await client.GetAsync("/api/status/uptime");
        Assert.Equal(HttpStatusCode.OK, api.StatusCode);
        var json = await api.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.Equal(15, doc.RootElement.GetProperty("windowDays").GetInt32());
        Assert.False(json.Contains("error", StringComparison.OrdinalIgnoreCase));
        Assert.DoesNotContain("target", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("local-health", json);
        Assert.DoesNotContain("Local status page", json);
        Assert.DoesNotContain("10.0.0.", json);
        Assert.DoesNotContain("127.0.0.1", json);

        foreach (var row in doc.RootElement.GetProperty("components").EnumerateArray())
        {
            Assert.True(row.TryGetProperty("id", out _));
            Assert.True(row.TryGetProperty("name", out _));
            Assert.True(row.TryGetProperty("uptimePercent", out var percent));
            Assert.Equal(JsonValueKind.Null, percent.ValueKind);
            Assert.Equal(15, row.GetProperty("days").GetArrayLength());
            Assert.False(row.TryGetProperty("error", out _));
            Assert.False(row.TryGetProperty("target", out _));
        }

        using var home = await client.GetAsync("/");
        var homeHtml = await home.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, home.StatusCode);
        Assert.Contains("uptime-bars", homeHtml);
        Assert.DoesNotContain("uptime-percent", homeHtml);
        Assert.DoesNotContain("100.0%", homeHtml);
        Assert.DoesNotContain("100%", homeHtml);
        Assert.DoesNotContain("Local status page", homeHtml);

        using var embed = await client.GetAsync("/embed");
        var embedHtml = await embed.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, embed.StatusCode);
        Assert.Contains("uptime-bars", embedHtml);
        Assert.DoesNotContain("uptime-percent", embedHtml);
        Assert.DoesNotContain("100.0%", embedHtml);
        Assert.DoesNotContain("100%", embedHtml);
        Assert.DoesNotContain("Local status page", embedHtml);
    }

    [Fact]
    public async Task Api_omits_internal_and_pages_show_percent_from_public_samples()
    {
        using var factory = new StatusPageFactory();
        var results = factory.Services.GetRequiredService<ICheckResultStore>();
        var now = DateTimeOffset.UtcNow;
        results.Append("chk-azure-status", new CheckResult
        {
            Status = CheckResultStatus.Ok,
            HttpStatus = 200,
            LatencyMs = 12,
            CheckedAtUtc = now
        });
        results.Append("chk-azure-status", new CheckResult
        {
            Status = CheckResultStatus.Fail,
            HttpStatus = 503,
            LatencyMs = 40,
            Error = "HTTP 503",
            CheckedAtUtc = now
        });
        results.Append("chk-local-health", new CheckResult
        {
            Status = CheckResultStatus.Fail,
            Error = "connect refused",
            CheckedAtUtc = now
        });

        using var client = factory.CreateClient();
        using var api = await client.GetAsync("/api/status/uptime");
        var json = await api.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.DoesNotContain("local-health", json);
        Assert.DoesNotContain("connect refused", json);
        Assert.DoesNotContain("HTTP 503", json);
        Assert.False(json.Contains("error", StringComparison.OrdinalIgnoreCase));
        Assert.DoesNotContain("target", json, StringComparison.OrdinalIgnoreCase);

        var azure = doc.RootElement.GetProperty("components").EnumerateArray()
            .Single(c => c.GetProperty("id").GetString() == "azure-status");
        Assert.Equal("Microsoft Azure", azure.GetProperty("name").GetString());
        Assert.Equal(1, azure.GetProperty("ok").GetInt32());
        Assert.Equal(1, azure.GetProperty("fail").GetInt32());
        Assert.Equal(50.0, azure.GetProperty("uptimePercent").GetDouble());
        var today = azure.GetProperty("days")[0];
        Assert.True(today.GetProperty("ok").GetInt32() + today.GetProperty("fail").GetInt32() > 0);

        using var home = await client.GetAsync("/");
        var homeHtml = await home.Content.ReadAsStringAsync();
        Assert.Contains("50.0%", homeHtml);
        Assert.Contains("uptime-percent", homeHtml);
        Assert.DoesNotContain("connect refused", homeHtml);
        Assert.DoesNotContain("Local status page", homeHtml);

        using var embed = await client.GetAsync("/embed");
        var embedHtml = await embed.Content.ReadAsStringAsync();
        Assert.Contains("50.0%", embedHtml);
        Assert.Contains("uptime-percent", embedHtml);
        Assert.DoesNotContain("connect refused", embedHtml);
    }

    [Fact]
    public async Task Muted_check_does_not_invent_ok_samples_on_public_uptime()
    {
        using var factory = new StatusPageFactory();
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Api-Key", "dev-key");
        using var created = await client.PostAsJsonAsync("/api/checks", new
        {
            name = "uptime-mute-probe",
            componentId = "uptime-mute-leaf",
            componentName = "Uptime mute leaf",
            type = "https",
            intervalSeconds = 15,
            timeoutSeconds = 2,
            target = new { url = "https://www.githubstatus.com/api/v2/status.json" }
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        using var createdDoc = JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        var id = createdDoc.RootElement.GetProperty("id").GetString();
        Assert.False(string.IsNullOrWhiteSpace(id));

        var store = factory.Services.GetRequiredService<IStatusStore>();
        store.RecordCheckResult(id!, new CheckResult
        {
            Status = CheckResultStatus.Fail,
            Error = "HTTP 503",
            CheckedAtUtc = DateTimeOffset.UtcNow.AddMinutes(-30)
        });
        var now = DateTimeOffset.UtcNow;
        using var muted = await client.PatchAsJsonAsync($"/api/checks/{id}", new
        {
            mutedFrom = now.AddMinutes(-5),
            mutedUntil = now.AddHours(1)
        });
        Assert.Equal(HttpStatusCode.OK, muted.StatusCode);
        store.RecordCheckResult(id!, new CheckResult
        {
            Status = CheckResultStatus.Ok,
            HttpStatus = 200,
            CheckedAtUtc = DateTimeOffset.UtcNow
        });

        using var anonymous = factory.CreateClient();
        using var api = await anonymous.GetAsync("/api/status/uptime");
        using var doc = JsonDocument.Parse(await api.Content.ReadAsStringAsync());
        var leaf = doc.RootElement.GetProperty("components").EnumerateArray()
            .Single(c => c.GetProperty("id").GetString() == "uptime-mute-leaf");
        Assert.Equal(0, leaf.GetProperty("ok").GetInt32());
        Assert.Equal(1, leaf.GetProperty("fail").GetInt32());
        Assert.Equal(0.0, leaf.GetProperty("uptimePercent").GetDouble());
        Assert.NotEqual(JsonValueKind.Null, leaf.GetProperty("uptimePercent").ValueKind);

        using var home = await anonymous.GetAsync("/");
        var html = await home.Content.ReadAsStringAsync();
        Assert.Contains("0.0%", html);
        Assert.DoesNotContain("100.0%", html);
        Assert.DoesNotContain("uptime-mute-probe", html);
        Assert.DoesNotContain("www.githubstatus.com", html);
    }

    private static StatusCheck PublicCheck(string id, string componentId) => new()
    {
        Id = id,
        Name = "public-probe",
        ComponentId = componentId,
        Enabled = true,
        Type = CheckType.Https,
        IntervalSeconds = 60,
        TimeoutSeconds = 10,
        Target = new CheckTargetSpec { Url = "https://www.githubstatus.com/api/v2/status.json" }
    };

    private static StatusCheck InternalCheck(string id, string componentId) => new()
    {
        Id = id,
        Name = "internal-probe",
        ComponentId = componentId,
        Enabled = true,
        Type = CheckType.Tcp,
        IntervalSeconds = 60,
        TimeoutSeconds = 10,
        Target = new CheckTargetSpec { Host = "10.0.0.8", Port = 5432 }
    };

    private static CheckResultSample Sample(string checkId, CheckResultStatus status, DateTimeOffset at) =>
        CheckResultSample.From(checkId, new CheckResult { Status = status, CheckedAtUtc = at });
}
