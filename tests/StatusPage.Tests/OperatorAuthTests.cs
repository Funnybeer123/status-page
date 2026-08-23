using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Json;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StatusPage.Api;
using StatusPage.Services;

namespace StatusPage.Tests;

public class OperatorAuthTests : IClassFixture<StatusPageFactory>
{
    private readonly StatusPageFactory _factory;

    public OperatorAuthTests(StatusPageFactory factory) => _factory = factory;

    [Fact]
    public async Task Entra_disabled_falls_back_to_api_key()
    {
        using var client = _factory.CreateClient();
        using var denied = await client.PostAsync("/api/checks",
            JsonContent.Create(new
            {
                name = "no-auth",
                componentId = "github-status",
                type = "https",
                target = new { url = "https://www.githubstatus.com/api/v2/status.json" }
            }));
        Assert.Equal(HttpStatusCode.Unauthorized, denied.StatusCode);

        using var authorized = _factory.CreateClient();
        authorized.DefaultRequestHeaders.Add("X-Api-Key", "dev-key");
        using var created = await authorized.PostAsync("/api/checks",
            JsonContent.Create(new
            {
                name = "any-url",
                componentId = "github-status",
                type = "https",
                intervalSeconds = 60,
                timeoutSeconds = 10,
                target = new { url = "https://www.githubstatus.com/api/v2/status.json" },
                http = new { expectedStatus = new[] { 200 }, jsonPath = "$.status.indicator", expectedJsonValue = "none" }
            }));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
    }

    [Fact]
    public async Task Operator_page_is_not_public_without_auth()
    {
        using var client = _factory.CreateClient();
        using var response = await client.GetAsync("/operator");
        var html = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("Operator sign-in", html);
        Assert.DoesNotContain("Add a check", html);
        Assert.DoesNotContain("Latest probe", html);

        using var noRedirect = _factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        using var raw = await noRedirect.GetAsync("/operator");
        Assert.Equal(HttpStatusCode.Redirect, raw.StatusCode);
        Assert.Contains("/operator/login", raw.Headers.Location?.ToString() ?? "");
    }

    [Fact]
    public async Task Operator_page_lists_checks_with_api_key()
    {
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Api-Key", "dev-key");
        using var response = await client.GetAsync("/operator");
        var html = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("Add a check", html);
        Assert.Contains("OPERATOR ADMIN", html);
        Assert.Contains("Audit log", html);
        Assert.Contains("Outbound webhooks", html);
        Assert.Contains("Save branding", html);
        Assert.Contains("Run now", html);
        Assert.Contains("/js/operator-checks.js", html);
        Assert.Contains("PATCH", html);
        Assert.Contains("/api/checks", html);
        Assert.DoesNotContain("SetCheckEnabled", html);
        Assert.DoesNotContain("asp-page-handler=\"UpdateCheck\"", html);
        Assert.Contains("Microsoft Azure", html);
        Assert.Contains("internal", html);
        Assert.DoesNotContain("Subscribe", html, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Public_page_stays_anonymous()
    {
        using var client = _factory.CreateClient();
        using var response = await client.GetAsync("/");
        var html = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("Business Systems", html);
        Assert.DoesNotContain("Add a check", html);
        Assert.DoesNotContain("Operator sign-in", html);
        Assert.DoesNotContain("Outbound webhooks", html);
        Assert.DoesNotContain("example.com/hooks/status", html);
    }

    [Fact]
    public void Authenticated_entra_user_without_role_or_object_id_is_not_operator()
    {
        var http = EntraHttp(EntraPrincipal(oid: "11111111-1111-1111-1111-111111111111"));
        Assert.False(OperatorAuth.IsOperator(http));
        Assert.False(OperatorAuth.IsViewer(http));
        Assert.False(OperatorAuth.IsStaff(http));
        Assert.True(OperatorAuth.IsDeniedEntraUser(http));
        Assert.False(OperatorAuth.HasOperatorGrant(http.User, Config()));
        Assert.False(OperatorAuth.HasViewerRole(http.User, Config()));
    }

    [Fact]
    public void StatusViewer_is_read_only_staff_not_operator()
    {
        var http = EntraHttp(EntraPrincipal(roles: ["StatusViewer"]));
        Assert.False(OperatorAuth.IsOperator(http));
        Assert.True(OperatorAuth.IsViewer(http));
        Assert.True(OperatorAuth.IsStaff(http));
        Assert.False(OperatorAuth.IsDeniedEntraUser(http));
        Assert.True(OperatorAuth.HasViewerRole(http.User, Config()));
        Assert.False(OperatorAuth.HasOperatorGrant(http.User, Config()));
    }

    [Fact]
    public void StatusOperator_role_claim_is_operator()
    {
        var http = EntraHttp(EntraPrincipal(roles: ["StatusOperator"]));
        Assert.True(OperatorAuth.IsOperator(http));
        Assert.False(OperatorAuth.IsDeniedEntraUser(http));
    }

    [Fact]
    public void StatusOperator_wids_claim_is_operator()
    {
        var http = EntraHttp(EntraPrincipal(wids: ["StatusOperator"]));
        Assert.True(OperatorAuth.IsOperator(http));
    }

    [Fact]
    public void Allowed_object_id_is_operator()
    {
        var oid = "22222222-2222-2222-2222-222222222222";
        var http = EntraHttp(
            EntraPrincipal(oid: oid),
            Config(allowedObjectIds: oid));
        Assert.True(OperatorAuth.IsOperator(http));
        Assert.False(OperatorAuth.IsViewer(http));
        Assert.False(OperatorAuth.IsDeniedEntraUser(http));
    }

    [Fact]
    public void Non_guid_allow_list_entries_never_grant_operator()
    {
        var user = EntraPrincipal(oid: "33333333-3333-3333-3333-333333333333");
        user.Identities.First().AddClaim(new Claim("preferred_username", "local-account"));
        user.Identities.First().AddClaim(new Claim(ClaimTypes.Upn, "local-account"));
        var http = EntraHttp(user, Config(allowedObjectIds: "local-account"));
        Assert.False(OperatorAuth.IsOperator(http));
        Assert.True(OperatorAuth.IsDeniedEntraUser(http));
        Assert.Empty(OperatorAuth.AllowedObjectIds(Config(allowedObjectIds: "local-account")));
    }

    [Fact]
    public async Task RequireOperator_returns_403_when_entra_user_has_neither_grant()
    {
        var http = EntraHttp(EntraPrincipal(oid: "44444444-4444-4444-4444-444444444444"));
        var context = new FakeFilterContext(http);
        var result = Assert.IsAssignableFrom<IResult>(
            await OperatorAuth.RequireOperator(context, _ => ValueTask.FromResult<object?>(Results.Ok())));
        var response = new DefaultHttpContext
        {
            RequestServices = http.RequestServices,
            Response = { Body = new MemoryStream() }
        };
        await result.ExecuteAsync(response);
        Assert.Equal(StatusCodes.Status403Forbidden, response.Response.StatusCode);
    }

    [Fact]
    public async Task Entra_user_without_grant_gets_403_on_operator_page_and_api()
    {
        using var factory = new EntraOperatorFactory();
        factory.Users.User = EntraPrincipal(oid: "55555555-5555-5555-5555-555555555555");
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        using var page = await client.GetAsync("/operator");
        Assert.Equal(HttpStatusCode.Forbidden, page.StatusCode);
        var html = await page.Content.ReadAsStringAsync();
        Assert.DoesNotContain("Add a check", html);

        using var api = await client.PostAsync("/api/checks", JsonContent.Create(new
        {
            name = "blocked",
            componentId = "github-status",
            type = "https",
            target = new { url = "https://www.githubstatus.com/api/v2/status.json" }
        }));
        Assert.Equal(HttpStatusCode.Forbidden, api.StatusCode);
    }

    [Fact]
    public async Task Entra_user_with_StatusOperator_role_is_operator()
    {
        using var factory = new EntraOperatorFactory();
        factory.Users.User = EntraPrincipal(oid: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", roles: ["StatusOperator"]);
        using var client = factory.CreateClient();
        using var page = await client.GetAsync("/operator");
        Assert.Equal(HttpStatusCode.OK, page.StatusCode);
        Assert.Contains("Add a check", await page.Content.ReadAsStringAsync());

        using var write = await client.PostAsJsonAsync("/api/operator/incidents", new
        {
            name = "Operator write incident",
            status = "investigating",
            impact = "minor",
            body = "StatusOperator can write."
        });
        Assert.Equal(HttpStatusCode.Created, write.StatusCode);

        using var submitted = await client.PostAsJsonAsync("/api/reports", new
        {
            title = "Entra operator report",
            body = "Promote audit actor must be oid."
        });
        Assert.Equal(HttpStatusCode.Created, submitted.StatusCode);
        using var submittedDoc = JsonDocument.Parse(await submitted.Content.ReadAsStringAsync());
        var reportId = submittedDoc.RootElement.GetProperty("id").GetString();
        using var promote = await client.PostAsJsonAsync($"/api/operator/reports/{reportId}/promote", new
        {
            impact = "minor",
            componentIds = new[] { "azure-status" }
        });
        Assert.Equal(HttpStatusCode.Created, promote.StatusCode);
        var audit = factory.Services.GetRequiredService<IAuditLog>();
        var entry = Assert.Single(audit.Recent(), e => e.TargetId == reportId && e.Action == "report.promote");
        Assert.Equal("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", entry.Actor);
        Assert.DoesNotContain("@", entry.Actor);
    }

    [Fact]
    public async Task StatusViewer_reads_operator_lists_and_is_403_on_write()
    {
        using var factory = new EntraOperatorFactory();
        factory.Users.User = EntraPrincipal(roles: ["StatusViewer"]);
        using var client = factory.CreateClient();

        using var page = await client.GetAsync("/operator");
        Assert.Equal(HttpStatusCode.OK, page.StatusCode);
        var html = await page.Content.ReadAsStringAsync();
        Assert.Contains("Audit log", html);
        Assert.Contains("Problem reports", html);
        Assert.Contains("StatusViewer is read-only", html);
        Assert.DoesNotContain("Add a check", html);
        Assert.DoesNotContain("Run now", html);
        Assert.DoesNotContain("Local status page", html);
        Assert.DoesNotContain("chk-local-health", html);

        using var checks = await client.GetAsync("/api/checks");
        Assert.Equal(HttpStatusCode.OK, checks.StatusCode);
        using var checksDoc = JsonDocument.Parse(await checks.Content.ReadAsStringAsync());
        Assert.DoesNotContain(checksDoc.RootElement.EnumerateArray(),
            c => c.GetProperty("id").GetString() == "chk-local-health");
        using var components = await client.GetAsync("/api/operator/components");
        Assert.Equal(HttpStatusCode.OK, components.StatusCode);
        using var audit = await client.GetAsync("/api/operator/audit");
        Assert.Equal(HttpStatusCode.OK, audit.StatusCode);
        using var export = await client.GetAsync("/api/checks/export");
        Assert.Equal(HttpStatusCode.OK, export.StatusCode);

        using var create = await client.PostAsJsonAsync("/api/checks", new
        {
            name = "viewer-blocked",
            componentId = "github-status",
            type = "https",
            target = new { url = "https://www.githubstatus.com/api/v2/status.json" }
        });
        Assert.Equal(HttpStatusCode.Forbidden, create.StatusCode);

        using var import = await client.PostAsJsonAsync("/api/checks/import", new
        {
            checks = new[]
            {
                new
                {
                    name = "viewer-import",
                    componentId = "github-status",
                    type = "https",
                    target = new { url = "https://www.githubstatus.com/api/v2/status.json" }
                }
            }
        });
        Assert.Equal(HttpStatusCode.Forbidden, import.StatusCode);

        using var patch = await client.PatchAsJsonAsync("/api/checks/chk-github-status", new { enabled = false });
        Assert.Equal(HttpStatusCode.Forbidden, patch.StatusCode);
        using var put = await client.PutAsJsonAsync("/api/checks/chk-github-status", new
        {
            name = "blocked",
            componentId = "github-status",
            type = "https",
            target = new { url = "https://www.githubstatus.com/api/v2/status.json" }
        });
        Assert.Equal(HttpStatusCode.Forbidden, put.StatusCode);
        using var run = await client.PostAsJsonAsync("/api/checks/chk-github-status/run", new { });
        Assert.Equal(HttpStatusCode.Forbidden, run.StatusCode);
        using var incident = await client.PostAsJsonAsync("/api/operator/incidents", new
        {
            name = "viewer blocked",
            status = "investigating",
            impact = "minor",
            body = "Viewers cannot open incidents."
        });
        Assert.Equal(HttpStatusCode.Forbidden, incident.StatusCode);
        using var branding = await client.PatchAsJsonAsync("/api/operator/page", new { name = "blocked" });
        Assert.Equal(HttpStatusCode.Forbidden, branding.StatusCode);
        using var webhook = await client.PostAsJsonAsync("/api/operator/webhooks",
            new { url = "https://example.com/hooks/status" });
        Assert.Equal(HttpStatusCode.Forbidden, webhook.StatusCode);
        using var templates = await client.GetAsync("/api/operator/templates");
        Assert.Equal(HttpStatusCode.OK, templates.StatusCode);
        using var createTemplate = await client.PostAsJsonAsync("/api/operator/templates", new
        {
            title = "viewer blocked",
            impact = "minor",
            componentIds = new[] { "azure-status" }
        });
        Assert.Equal(HttpStatusCode.Forbidden, createTemplate.StatusCode);

        using var submitted = await client.PostAsJsonAsync("/api/reports", new
        {
            title = "Viewer can read this report",
            body = "StatusViewer must not promote."
        });
        Assert.Equal(HttpStatusCode.Created, submitted.StatusCode);
        using var submittedDoc = JsonDocument.Parse(await submitted.Content.ReadAsStringAsync());
        var reportId = submittedDoc.RootElement.GetProperty("id").GetString();
        using var listReports = await client.GetAsync("/api/operator/reports");
        Assert.Equal(HttpStatusCode.OK, listReports.StatusCode);
        using var promote = await client.PostAsJsonAsync($"/api/operator/reports/{reportId}/promote", new
        {
            impact = "minor",
            componentIds = new[] { "azure-status" }
        });
        Assert.Equal(HttpStatusCode.Forbidden, promote.StatusCode);
    }

    [Fact]
    public async Task Entra_user_with_allowed_object_id_is_operator()
    {
        var oid = "66666666-6666-6666-6666-666666666666";
        using var factory = new EntraOperatorFactory(allowedObjectIds: oid);
        factory.Users.User = EntraPrincipal(oid: oid);
        using var client = factory.CreateClient();
        using var page = await client.GetAsync("/operator");
        Assert.Equal(HttpStatusCode.OK, page.StatusCode);
        Assert.Contains("Add a check", await page.Content.ReadAsStringAsync());
    }

    [Fact]
    public void Operator_page_model_returns_403_for_entra_user_without_grant()
    {
        var state = DemoSeed.Create("http://localhost:5080", DateTimeOffset.UtcNow);
        var store = new InMemoryStatusStore(state);
        var http = EntraHttp(EntraPrincipal(oid: "77777777-7777-7777-7777-777777777777"));
        var page = new StatusPage.Pages.OperatorModel(
            store,
            Config(),
            new TestHostEnvironment(),
            new FileAuditLog(Path.GetTempFileName()),
            new FileWebhookStore(Path.Combine(Path.GetTempPath(), $"op-webhooks-{Guid.NewGuid():N}.json")),
            new FileIncidentTemplateStore(Path.Combine(Path.GetTempPath(), $"op-templates-{Guid.NewGuid():N}.json")),
            new InMemoryProblemReportStore())
        {
            PageContext = new Microsoft.AspNetCore.Mvc.RazorPages.PageContext
            {
                HttpContext = http
            }
        };
        var result = page.OnGet();
        var status = Assert.IsType<Microsoft.AspNetCore.Mvc.StatusCodeResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, status.StatusCode);
    }

    private static ClaimsPrincipal EntraPrincipal(
        string? oid = null,
        IEnumerable<string>? roles = null,
        IEnumerable<string>? wids = null)
    {
        var claims = new List<Claim> { new(ClaimTypes.Name, "test-user"), new("name", "test-user") };
        if (!string.IsNullOrWhiteSpace(oid))
        {
            claims.Add(new Claim("oid", oid));
            claims.Add(new Claim(OperatorAuth.ObjectIdClaimLong, oid));
        }

        foreach (var role in roles ?? [])
        {
            claims.Add(new Claim("roles", role));
        }

        foreach (var wid in wids ?? [])
        {
            claims.Add(new Claim("wids", wid));
        }

        return new ClaimsPrincipal(new ClaimsIdentity(claims, "oidc"));
    }

    private static DefaultHttpContext EntraHttp(ClaimsPrincipal user, IConfiguration? config = null)
    {
        config ??= Config();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton(config);
        services.AddSingleton<IHostEnvironment>(new TestHostEnvironment());
        return new DefaultHttpContext
        {
            User = user,
            RequestServices = services.BuildServiceProvider()
        };
    }

    private static IConfiguration Config(string? allowedObjectIds = null) =>
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["AzureAd:TenantId"] = "test-tenant",
            ["AzureAd:ClientId"] = "test-client",
            ["AzureAd:OperatorRole"] = OperatorAuth.DefaultOperatorRole,
            ["AzureAd:ViewerRole"] = OperatorAuth.DefaultViewerRole,
            ["AzureAd:AllowedObjectIds"] = allowedObjectIds ?? ""
        }).Build();

    private sealed class FakeFilterContext(HttpContext http) : EndpointFilterInvocationContext
    {
        public override HttpContext HttpContext { get; } = http;
        public override IList<object?> Arguments { get; } = [];
        public override T GetArgument<T>(int index) => default!;
    }

    private sealed class TestHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Development;
        public string ApplicationName { get; set; } = "StatusPage.Tests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}

public sealed class TestEntraUserHolder
{
    public ClaimsPrincipal? User { get; set; }
}

public sealed class EntraOperatorFactory : WebApplicationFactory<Program>
{
    private readonly string _allowedObjectIds;
    public TestEntraUserHolder Users { get; } = new();

    public EntraOperatorFactory(string? allowedObjectIds = null) =>
        _allowedObjectIds = allowedObjectIds ?? "";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        var checksPath = Path.Combine(Path.GetTempPath(), $"status-page-entra-{Guid.NewGuid():N}.json");
        var pagePath = Path.Combine(Path.GetTempPath(), $"status-page-entra-page-{Guid.NewGuid():N}.json");
        var brandingPath = Path.Combine(Path.GetTempPath(), $"status-page-entra-brand-{Guid.NewGuid():N}");
        var resultsPath = Path.Combine(Path.GetTempPath(), $"status-page-entra-results-{Guid.NewGuid():N}.json");
        var auditPath = Path.Combine(Path.GetTempPath(), $"status-page-entra-audit-{Guid.NewGuid():N}.jsonl");
        var webhooksPath = Path.Combine(Path.GetTempPath(), $"status-page-entra-webhooks-{Guid.NewGuid():N}.json");
        var templatesPath = Path.Combine(Path.GetTempPath(), $"status-page-entra-templates-{Guid.NewGuid():N}.json");
        var templatesSeed = Path.Combine(Path.GetTempPath(), $"status-page-entra-templates-seed-{Guid.NewGuid():N}.json");
        builder.UseEnvironment("Development");
        builder.UseSetting("StatusPage:EnableCheckWorker", "false");
        builder.UseSetting("StatusPage:EnableConnectorWorker", "false");
        builder.UseSetting("StatusPage:ApiKey", "dev-key");
        builder.UseSetting("StatusPage:ChecksPath", checksPath);
        builder.UseSetting("StatusPage:PagePath", pagePath);
        builder.UseSetting("StatusPage:BrandingPath", brandingPath);
        builder.UseSetting("StatusPage:ResultsPath", resultsPath);
        builder.UseSetting("StatusPage:AuditPath", auditPath);
        builder.UseSetting("StatusPage:WebhooksPath", webhooksPath);
        builder.UseSetting("StatusPage:TemplatesPath", templatesPath);
        builder.UseSetting("StatusPage:TemplatesSeedPath", templatesSeed);
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["StatusPage:EnableCheckWorker"] = "false",
                ["StatusPage:EnableConnectorWorker"] = "false",
                ["StatusPage:ApiKey"] = "dev-key",
                ["StatusPage:ChecksPath"] = checksPath,
                ["StatusPage:PagePath"] = pagePath,
                ["StatusPage:BrandingPath"] = brandingPath,
                ["StatusPage:ResultsPath"] = resultsPath,
                ["StatusPage:AuditPath"] = auditPath,
                ["StatusPage:WebhooksPath"] = webhooksPath,
                ["StatusPage:TemplatesPath"] = templatesPath,
                ["StatusPage:TemplatesSeedPath"] = templatesSeed,
                ["AzureAd:Instance"] = "https://login.microsoftonline.com/",
                ["AzureAd:TenantId"] = "test-tenant",
                ["AzureAd:ClientId"] = "test-client",
                ["AzureAd:OperatorRole"] = OperatorAuth.DefaultOperatorRole,
                ["AzureAd:ViewerRole"] = OperatorAuth.DefaultViewerRole,
                ["AzureAd:AllowedObjectIds"] = _allowedObjectIds
            });
        });
        builder.ConfigureTestServices(services =>
        {
            services.AddSingleton(Users);
            services.AddAuthentication()
                .AddScheme<AuthenticationSchemeOptions, TestEntraAuthHandler>(TestEntraAuthHandler.SchemeName, _ => { });
            services.PostConfigure<AuthenticationOptions>(options =>
            {
                options.DefaultAuthenticateScheme = TestEntraAuthHandler.SchemeName;
            });
        });
    }
}

public sealed class TestEntraAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    TestEntraUserHolder users) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "TestEntra";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var user = users.User;
        if (user?.Identity?.IsAuthenticated == true)
        {
            return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(user, SchemeName)));
        }

        return Task.FromResult(AuthenticateResult.NoResult());
    }
}
