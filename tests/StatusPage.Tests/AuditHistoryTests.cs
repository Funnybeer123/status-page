using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using StatusPage.Api;
using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Tests;

public class AuditHistoryTests : IClassFixture<StatusPageFactory>
{
    private readonly StatusPageFactory _factory;

    public AuditHistoryTests(StatusPageFactory factory) => _factory = factory;

    [Fact]
    public async Task Check_create_write_appears_in_operator_audit_log()
    {
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Api-Key", "dev-key");
        using var created = await client.PostAsJsonAsync("/api/checks", new
        {
            name = "audit-probe",
            componentId = "audit-leaf",
            componentName = "Audit leaf",
            type = "tcp",
            intervalSeconds = 15,
            timeoutSeconds = 2,
            target = new { host = "10.9.9.9", port = 22 }
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        using var doc = JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        var id = doc.RootElement.GetProperty("id").GetString();
        Assert.False(string.IsNullOrWhiteSpace(id));

        var audit = _factory.Services.GetRequiredService<IAuditLog>();
        var entry = Assert.Single(audit.Recent(), e => e.TargetId == id && e.Action == "check.create");
        Assert.Equal("api-key", entry.Actor);
        Assert.DoesNotContain("@", entry.Actor);

        using var page = await client.GetAsync("/operator");
        var html = await page.Content.ReadAsStringAsync();
        Assert.Contains("Audit log", html);
        Assert.Contains("check.create", html);
        Assert.Contains(id!, html);
        Assert.Contains("api-key", html);
    }

    [Fact]
    public void Audit_file_is_append_only_jsonl_without_emails()
    {
        var path = Path.Combine(Path.GetTempPath(), $"audit-{Guid.NewGuid():N}.jsonl");
        var log = new FileAuditLog(path);
        log.Append("api-key", "check.disable", "chk-1");
        log.Append("22222222-2222-2222-2222-222222222222", "check.edit", "chk-1");
        var text = File.ReadAllText(path);
        Assert.Contains("check.disable", text);
        Assert.Contains("api-key", text);
        Assert.DoesNotContain("@", text);
        Assert.Equal(2, log.Recent().Count);
        Assert.Equal("check.edit", log.Recent()[0].Action);
    }

    [Fact]
    public void Actor_is_api_key_or_entra_oid_never_email()
    {
        var oid = "88888888-8888-8888-8888-888888888888";
        var http = new DefaultHttpContext
        {
            User = new System.Security.Claims.ClaimsPrincipal(
                new System.Security.Claims.ClaimsIdentity(
                    [
                        new System.Security.Claims.Claim("oid", oid),
                        new System.Security.Claims.Claim("preferred_username", "local-account"),
                        new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Email, "local-account")
                    ],
                    "oidc")),
            RequestServices = new ServiceCollection()
                .AddSingleton<IConfiguration>(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["AzureAd:TenantId"] = "test-tenant",
                    ["AzureAd:ClientId"] = "test-client"
                }).Build())
                .AddSingleton<IHostEnvironment>(new OperatorAuthTestsHost())
                .BuildServiceProvider()
        };
        Assert.Equal(oid, OperatorAuth.Actor(http));
        Assert.DoesNotContain("@", OperatorAuth.Actor(http));
    }

    [Fact]
    public void Check_results_persist_locked_fields_and_hide_internal_from_public_bars()
    {
        var path = Path.Combine(Path.GetTempPath(), $"results-{Guid.NewGuid():N}.json");
        var store = new CheckResultStore(path);
        var now = DateTimeOffset.UtcNow;
        var publicFail = new CheckResult
        {
            Status = CheckResultStatus.Fail,
            HttpStatus = 503,
            LatencyMs = 42,
            Error = "HTTP 503",
            CheckedAtUtc = now
        };
        var internalFail = new CheckResult
        {
            Status = CheckResultStatus.Fail,
            HttpStatus = null,
            LatencyMs = 8,
            Error = "connect refused",
            CheckedAtUtc = now
        };
        store.Append("pub-check", publicFail);
        store.Append("int-check", internalFail);

        var json = File.ReadAllText(path);
        using var doc = JsonDocument.Parse(json);
        var sample = doc.RootElement.GetProperty("results")[0];
        foreach (var allowed in new[] { "checkId", "checkedAtUtc", "status", "httpStatus", "latencyMs", "error" })
        {
            Assert.True(sample.TryGetProperty(allowed, out _) || allowed == "httpStatus");
        }

        foreach (var banned in new[] { "body", "headers", "Authorization", "responseBody" })
        {
            Assert.DoesNotContain(banned, json, StringComparison.OrdinalIgnoreCase);
        }

        var publicCheck = new StatusCheck
        {
            Id = "pub-check",
            Target = new CheckTargetSpec { Url = "https://www.githubstatus.com/api/v2/status.json" }
        };
        var internalCheck = new StatusCheck
        {
            Id = "int-check",
            Target = new CheckTargetSpec { Host = "10.0.0.8", Port = 5432 }
        };
        var today = DateOnly.FromDateTime(now.UtcDateTime);
        Assert.True(PublicUptime.DayFailed(store.List(), [publicCheck, internalCheck], today));
        Assert.False(PublicUptime.DayFailed(store.List(), [internalCheck], today));

        var stale = CheckResultSample.From("pub-check", new CheckResult
        {
            Status = CheckResultStatus.Fail,
            CheckedAtUtc = now.AddDays(-16)
        });
        var trimmed = CheckResultStore.Trim(store.List().Concat([stale]), now);
        Assert.DoesNotContain(trimmed, s => s.CheckedAtUtc < now.AddDays(-CheckResultStore.PublicBarDays));
        Assert.Equal(15, CheckResultStore.PublicBarDays);

        var reloaded = new CheckResultStore(path);
        var hydrated = new StatusCheck { Id = "pub-check" };
        reloaded.Hydrate([hydrated]);
        Assert.NotEmpty(hydrated.Results);
        Assert.Equal(CheckResultStatus.Fail, hydrated.LastResult!.Status);
        Assert.Equal(42, hydrated.LastResult.LatencyMs);
        Assert.Equal(503, hydrated.LastResult.HttpStatus);
    }

    private sealed class OperatorAuthTestsHost : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Development;
        public string ApplicationName { get; set; } = "StatusPage.Tests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } =
            new Microsoft.Extensions.FileProviders.NullFileProvider();
    }
}
