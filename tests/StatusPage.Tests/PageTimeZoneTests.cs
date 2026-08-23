using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Xml.Linq;
using Microsoft.Extensions.DependencyInjection;
using StatusPage.Api;
using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Tests;

public class PageTimeZoneTests
{
    [Fact]
    public async Task Default_page_time_zone_is_etc_utc()
    {
        using var factory = new StatusPageFactory();
        using var client = factory.CreateClient();

        using var summary = await client.GetAsync("/api/v2/summary.json");
        Assert.Equal(HttpStatusCode.OK, summary.StatusCode);
        using var summaryDoc = JsonDocument.Parse(await summary.Content.ReadAsStringAsync());
        Assert.Equal("Etc/UTC", summaryDoc.RootElement.GetProperty("page").GetProperty("time_zone").GetString());

        using var operatorClient = factory.CreateClient();
        operatorClient.DefaultRequestHeaders.Add("X-Api-Key", "dev-key");
        using var page = await operatorClient.GetAsync("/api/operator/page");
        using var pageDoc = JsonDocument.Parse(await page.Content.ReadAsStringAsync());
        Assert.Equal("Etc/UTC", pageDoc.RootElement.GetProperty("timeZone").GetString());

        using var home = await client.GetAsync("/");
        var homeHtml = await home.Content.ReadAsStringAsync();
        Assert.Contains("Etc/UTC", homeHtml);

        using var embed = await client.GetAsync("/embed");
        var embedHtml = await embed.Content.ReadAsStringAsync();
        Assert.Contains("Etc/UTC", embedHtml);

        using var ics = await client.GetAsync("/maintenance.ics");
        Assert.Contains("X-WR-TIMEZONE:Etc/UTC", await ics.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Valid_iana_zone_appears_in_summary_and_display_surfaces()
    {
        using var factory = new StatusPageFactory();
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Api-Key", "dev-key");

        using var patched = await client.PatchAsJsonAsync("/api/operator/page", new
        {
            timeZone = "America/Los_Angeles"
        });
        Assert.Equal(HttpStatusCode.OK, patched.StatusCode);
        using var patchedDoc = JsonDocument.Parse(await patched.Content.ReadAsStringAsync());
        Assert.Equal("America/Los_Angeles", patchedDoc.RootElement.GetProperty("timeZone").GetString());

        using var anonymous = factory.CreateClient();
        using var summary = await anonymous.GetAsync("/api/v2/summary.json");
        using var summaryDoc = JsonDocument.Parse(await summary.Content.ReadAsStringAsync());
        Assert.Equal("America/Los_Angeles", summaryDoc.RootElement.GetProperty("page").GetProperty("time_zone").GetString());

        using var home = await anonymous.GetAsync("/");
        Assert.Contains("America/Los_Angeles", await home.Content.ReadAsStringAsync());

        using var embed = await anonymous.GetAsync("/embed");
        Assert.Contains("America/Los_Angeles", await embed.Content.ReadAsStringAsync());

        using var ics = await anonymous.GetAsync("/maintenance.ics");
        Assert.Contains("X-WR-TIMEZONE:America/Los_Angeles", await ics.Content.ReadAsStringAsync());

        using var incident = await client.PostAsJsonAsync("/api/operator/incidents", new
        {
            name = "Timezone label advisory",
            status = "investigating",
            impact = "minor",
            body = "Display-only zone.",
            componentIds = new[] { "azure-status" }
        });
        Assert.Equal(HttpStatusCode.Created, incident.StatusCode);

        using var rss = await anonymous.GetAsync("/incidents.rss");
        var rssXml = XDocument.Parse(await rss.Content.ReadAsStringAsync());
        var pubDate = rssXml.Descendants("item")
            .First(i => (string?)i.Element("title") == "Timezone label advisory")
            .Element("pubDate")?.Value;
        Assert.False(string.IsNullOrWhiteSpace(pubDate));
        Assert.EndsWith("-0700", pubDate);
    }

    [Fact]
    public async Task Invalid_or_unknown_zone_is_rejected()
    {
        using var factory = new StatusPageFactory();
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Api-Key", "dev-key");

        foreach (var zone in new[] { "Not/AZone", "America/NotACity", "foo", "" })
        {
            using var rejected = await client.PatchAsJsonAsync("/api/operator/page", new { timeZone = zone });
            Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);
            using var doc = JsonDocument.Parse(await rejected.Content.ReadAsStringAsync());
            Assert.Contains("IANA", doc.RootElement.GetProperty("error").GetString(), StringComparison.OrdinalIgnoreCase);
        }

        using var anonymous = factory.CreateClient();
        using var summary = await anonymous.GetAsync("/api/v2/summary.json");
        using var summaryDoc = JsonDocument.Parse(await summary.Content.ReadAsStringAsync());
        Assert.Equal("Etc/UTC", summaryDoc.RootElement.GetProperty("page").GetProperty("time_zone").GetString());
    }

    [Fact]
    public async Task Samples_and_mute_windows_stay_utc_after_zone_change()
    {
        using var factory = new StatusPageFactory();
        var store = factory.Services.GetRequiredService<IStatusStore>();
        var results = factory.Services.GetRequiredService<ICheckResultStore>();
        var fourAmUtc = new DateTimeOffset(DateTime.UtcNow.Year, DateTime.UtcNow.Month, DateTime.UtcNow.Day, 4, 0, 0, TimeSpan.Zero);
        var utcDay = DateOnly.FromDateTime(fourAmUtc.UtcDateTime);
        var la = TimeZoneInfo.FindSystemTimeZoneById("America/Los_Angeles");
        var localDay = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(fourAmUtc, la).DateTime);
        Assert.NotEqual(utcDay, localDay);

        store.RecordCheckResult("chk-azure-status", new CheckResult
        {
            Status = CheckResultStatus.Ok,
            HttpStatus = 200,
            LatencyMs = 12,
            CheckedAtUtc = fourAmUtc
        });

        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Api-Key", "dev-key");
        using var created = await client.PostAsJsonAsync("/api/checks", new
        {
            name = "tz-mute-probe",
            componentId = "tz-mute-leaf",
            componentName = "Timezone mute leaf",
            type = "tcp",
            intervalSeconds = 15,
            timeoutSeconds = 2,
            target = new { host = "127.0.0.1", port = 9 }
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        using var createdDoc = JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        var checkId = createdDoc.RootElement.GetProperty("id").GetString();
        Assert.False(string.IsNullOrWhiteSpace(checkId));

        using var muted = await client.PatchAsJsonAsync($"/api/checks/{checkId}", new
        {
            mutedFrom = new DateTimeOffset(2026, 8, 23, 16, 0, 0, TimeSpan.Zero),
            mutedUntil = new DateTimeOffset(2026, 8, 23, 18, 0, 0, TimeSpan.Zero)
        });
        Assert.Equal(HttpStatusCode.OK, muted.StatusCode);

        using var zone = await client.PatchAsJsonAsync("/api/operator/page", new
        {
            timeZone = "America/Los_Angeles"
        });
        Assert.Equal(HttpStatusCode.OK, zone.StatusCode);

        var stored = Assert.Single(results.List(), s => s.CheckId == "chk-azure-status");
        Assert.Equal(fourAmUtc, stored.CheckedAtUtc.ToUniversalTime());
        Assert.Equal(utcDay, DateOnly.FromDateTime(stored.CheckedAtUtc.UtcDateTime));

        using var checkResults = await client.GetAsync("/api/checks/chk-azure-status/results");
        using var checkResultsDoc = JsonDocument.Parse(await checkResults.Content.ReadAsStringAsync());
        var checkedAt = checkResultsDoc.RootElement.GetProperty("latest").GetProperty("checkedAtUtc").GetString();
        Assert.False(string.IsNullOrWhiteSpace(checkedAt));
        Assert.True(
            checkedAt!.EndsWith("Z", StringComparison.Ordinal) || checkedAt.EndsWith("+00:00", StringComparison.Ordinal),
            checkedAt);
        var parsed = DateTimeOffset.Parse(checkedAt);
        Assert.Equal(fourAmUtc, parsed.ToUniversalTime());

        using var muteGot = await client.GetAsync($"/api/checks/{checkId}");
        using var muteDoc = JsonDocument.Parse(await muteGot.Content.ReadAsStringAsync());
        Assert.Equal("2026-08-23T16:00:00.000Z", muteDoc.RootElement.GetProperty("mutedFrom").GetString());
        Assert.Equal("2026-08-23T18:00:00.000Z", muteDoc.RootElement.GetProperty("mutedUntil").GetString());

        using var anonymous = factory.CreateClient();
        using var uptime = await anonymous.GetAsync("/api/status/uptime");
        using var uptimeDoc = JsonDocument.Parse(await uptime.Content.ReadAsStringAsync());
        var azure = uptimeDoc.RootElement.GetProperty("components").EnumerateArray()
            .Single(c => c.GetProperty("id").GetString() == "azure-status");
        var sampled = azure.GetProperty("days").EnumerateArray()
            .Where(d => d.GetProperty("ok").GetInt32() + d.GetProperty("fail").GetInt32() > 0)
            .ToList();
        Assert.Contains(sampled, d => d.GetProperty("date").GetString() == utcDay.ToString("yyyy-MM-dd"));
        Assert.DoesNotContain(sampled, d => d.GetProperty("date").GetString() == localDay.ToString("yyyy-MM-dd"));
    }

    [Fact]
    public void Uptime_buckets_stay_utc_days_regardless_of_page_zone()
    {
        var now = new DateTimeOffset(2026, 8, 23, 12, 0, 0, TimeSpan.Zero);
        var sampleAt = new DateTimeOffset(2026, 8, 23, 4, 0, 0, TimeSpan.Zero);
        var state = DemoSeed.Create("http://localhost:5080", now);
        state.Page.TimeZone = "America/Los_Angeles";
        state.Checks =
        [
            new StatusCheck
            {
                Id = "chk-pub",
                Name = "public-probe",
                ComponentId = "azure-status",
                Enabled = true,
                Type = CheckType.Https,
                IntervalSeconds = 60,
                TimeoutSeconds = 10,
                Target = new CheckTargetSpec { Url = "https://www.githubstatus.com/api/v2/status.json" }
            }
        ];
        var store = new InMemoryStatusStore(state);
        var samples = new[]
        {
            CheckResultSample.From("chk-pub", new CheckResult
            {
                Status = CheckResultStatus.Ok,
                CheckedAtUtc = sampleAt
            })
        };

        var leaves = PublicUptime.ForPublicLeaves(PublicApiMapper.ForPublic(store), store.ListChecks(), samples, now);
        var azure = Assert.Single(leaves, l => l.Id == "azure-status");
        var sampled = Assert.Single(azure.Days, d => d.HasSamples);
        Assert.Equal(new DateOnly(2026, 8, 23), sampled.Date);
        Assert.DoesNotContain(azure.Days, d => d.Date == new DateOnly(2026, 8, 22) && d.HasSamples);
    }

    [Fact]
    public void Label_and_require_use_iana_ids()
    {
        var utc = new DateTimeOffset(2026, 8, 23, 16, 0, 0, TimeSpan.Zero);
        Assert.Equal("2026-08-23 16:00 Etc/UTC", PageTimeZone.Label(utc, PageTimeZone.DefaultId));
        Assert.Equal("2026-08-23 09:00 America/Los_Angeles", PageTimeZone.Label(utc, "America/Los_Angeles"));
        Assert.Equal("America/Los_Angeles", PageTimeZone.Require("America/Los_Angeles"));
        var ex = Assert.Throws<ArgumentException>(() => PageTimeZone.Require("Not/AZone"));
        Assert.Contains("IANA", ex.Message, StringComparison.OrdinalIgnoreCase);
    }
}
