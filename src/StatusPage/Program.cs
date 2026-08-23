using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using StatusPage.Api;
using StatusPage.Connectors;
using StatusPage.Domain;
using StatusPage.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRazorPages();
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.WriteIndented = true;
    options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});

var entra = OperatorAuth.IsAzureAdConfigured(builder.Configuration);
var auth = builder.Services.AddAuthentication(options =>
{
    options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = entra
        ? OpenIdConnectDefaults.AuthenticationScheme
        : CookieAuthenticationDefaults.AuthenticationScheme;
}).AddCookie(options =>
{
    options.LoginPath = "/operator/login";
    options.Cookie.Name = "statuspage.auth";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
});

if (entra)
{
    auth.AddOpenIdConnect(options =>
    {
        var instance = (builder.Configuration["AzureAd:Instance"] ?? "https://login.microsoftonline.com/").TrimEnd('/');
        var tenant = builder.Configuration["AzureAd:TenantId"]!.Trim();
        options.Authority = $"{instance}/{tenant}/v2.0";
        options.ClientId = builder.Configuration["AzureAd:ClientId"];
        options.ClientSecret = builder.Configuration["AzureAd:ClientSecret"];
        options.ResponseType = OpenIdConnectResponseType.Code;
        options.CallbackPath = "/signin-oidc";
        options.SignedOutCallbackPath = "/signout-callback-oidc";
        options.SaveTokens = false;
        options.GetClaimsFromUserInfoEndpoint = false;
        options.MapInboundClaims = false;
        options.Scope.Clear();
        options.Scope.Add("openid");
        options.Scope.Add("profile");
        options.TokenValidationParameters.NameClaimType = "name";
        options.TokenValidationParameters.RoleClaimType = "roles";
        options.TokenValidationParameters.ValidateIssuer = true;
    });
}

builder.Services.AddAuthorization();

var publicUrl = builder.Configuration["StatusPage:PublicUrl"] ?? "http://localhost:5080";
var selfHealth = builder.Configuration["StatusPage:SelfHealthUrl"]
                 ?? $"{publicUrl.TrimEnd('/')}/health";
var seed = DemoSeed.Create(publicUrl, DateTimeOffset.UtcNow);

var seedPath = Path.Combine(builder.Environment.ContentRootPath, "Data", "checks.seed.json");
var runtimePath = builder.Configuration["StatusPage:ChecksPath"]
                  ?? Path.Combine(builder.Environment.ContentRootPath, "data", "checks.json");
var pagePath = builder.Configuration["StatusPage:PagePath"]
               ?? Path.Combine(builder.Environment.ContentRootPath, "data", "page.json");
var brandingDir = builder.Configuration["StatusPage:BrandingPath"]
                  ?? Path.Combine(builder.Environment.ContentRootPath, "data", "branding");
var resultsPath = builder.Configuration["StatusPage:ResultsPath"]
                  ?? Path.Combine(builder.Environment.ContentRootPath, "data", "check-results.json");
var auditPath = builder.Configuration["StatusPage:AuditPath"]
                ?? Path.Combine(builder.Environment.ContentRootPath, "data", "audit.jsonl");
var webhooksPath = builder.Configuration["StatusPage:WebhooksPath"]
                   ?? Path.Combine(builder.Environment.ContentRootPath, "data", "webhooks.json");
var templatesPath = builder.Configuration["StatusPage:TemplatesPath"]
                    ?? Path.Combine(builder.Environment.ContentRootPath, "data", "incident-templates.json");
var templatesSeed = builder.Configuration["StatusPage:TemplatesSeedPath"]
                    ?? Path.Combine(builder.Environment.ContentRootPath, "Data", "incident-templates.seed.json");
var checks = File.Exists(runtimePath)
    ? CheckConfigStore.Load(runtimePath, DateTimeOffset.UtcNow)
    : CheckConfigStore.Load(seedPath, DateTimeOffset.UtcNow);
DemoSeed.BindSelfHealthChecks(checks, selfHealth);
seed.Checks = checks;
PageConfigStore.Apply(seed, pagePath);
var resultStore = new CheckResultStore(resultsPath);
resultStore.Hydrate(checks);

builder.Services.AddSingleton<ICheckResultStore>(resultStore);
builder.Services.AddSingleton<IAuditLog>(_ => new FileAuditLog(auditPath));
builder.Services.AddSingleton<IWebhookStore>(_ => new FileWebhookStore(webhooksPath));
builder.Services.AddSingleton<IIncidentTemplateStore>(_ => new FileIncidentTemplateStore(templatesPath, templatesSeed));
builder.Services.AddSingleton<IWebhookSender, WebhookSender>();
builder.Services.AddSingleton<IStatusStore>(sp =>
    new InMemoryStatusStore(seed, persist =>
    {
        try
        {
            CheckConfigStore.Save(runtimePath, persist);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Could not persist checks.json: {ex.Message}");
        }
    }, persist =>
    {
        try
        {
            PageConfigStore.Save(pagePath, persist);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Could not persist page.json: {ex.Message}");
        }
    }, resultStore, sp.GetRequiredService<IWebhookSender>()));
builder.Services.AddSingleton<CheckRunner>();
builder.Services.AddHttpClient("StatusChecks", client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("status-page-check/1.0");
});
builder.Services.AddHttpClient("StatusConnectors", client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("status-page-connector/1.0");
});
builder.Services.AddHttpClient(WebhookSender.HttpClientName, client =>
{
    client.Timeout = WebhookSender.Timeout;
    client.DefaultRequestHeaders.UserAgent.ParseAdd("status-page-webhook/1.0");
});

builder.Services.AddSingleton<IStatusConnector>(sp =>
{
    var http = sp.GetRequiredService<IHttpClientFactory>().CreateClient("StatusConnectors");
    var config = sp.GetRequiredService<IConfiguration>();
    return new AzureServiceHealthConnector(http, config, AzureCredentialGate.TokenProvider(config));
});
builder.Services.AddSingleton<IStatusConnector>(sp =>
    new AzureDevOpsConnector(
        sp.GetRequiredService<IHttpClientFactory>().CreateClient("StatusConnectors"),
        sp.GetRequiredService<IConfiguration>()));
builder.Services.AddSingleton<IStatusConnector>(sp =>
    new GitHubConnector(
        sp.GetRequiredService<IHttpClientFactory>().CreateClient("StatusConnectors"),
        sp.GetRequiredService<IConfiguration>()));

if (builder.Configuration.GetValue("StatusPage:EnableCheckWorker", true))
{
    builder.Services.AddHostedService<CheckWorker>();
}

if (builder.Configuration.GetValue("StatusPage:EnableConnectorWorker", true))
{
    builder.Services.AddHostedService<ConnectorWorker>();
}

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
}

app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.Use(async (context, next) =>
{
    OperatorAuth.AttachApiKeyIdentity(context);
    await next();
});
app.UseAuthorization();

app.MapGet("/health", () => Results.Text("ok", "text/plain"));
app.MapGet("/branding/{file}", (string file) => BrandingFiles.Serve(brandingDir, file));

app.MapGet("/api/v2/summary.json", (IStatusStore store) => Results.Json(PublicApiMapper.Summary(PublicApiMapper.ForPublic(store))));
app.MapGet("/api/v2/status.json", (IStatusStore store) => Results.Json(PublicApiMapper.Status(PublicApiMapper.ForPublic(store))));
app.MapGet("/api/v2/components.json", (IStatusStore store) => Results.Json(PublicApiMapper.Components(PublicApiMapper.ForPublic(store))));
app.MapGet("/api/v2/incidents.json", (IStatusStore store) => Results.Json(PublicApiMapper.Incidents(PublicApiMapper.ForPublic(store))));
app.MapGet("/api/v2/scheduled-maintenances.json", (IStatusStore store) => Results.Json(PublicApiMapper.ScheduledMaintenances(PublicApiMapper.ForPublic(store))));
app.MapGet("/incidents.rss", (IStatusStore store) =>
    Results.Content(PublicFeeds.Rss(PublicApiMapper.ForPublic(store)), "application/rss+xml; charset=utf-8"));
app.MapGet("/incidents.atom", (IStatusStore store) =>
    Results.Content(PublicFeeds.Atom(PublicApiMapper.ForPublic(store)), "application/atom+xml; charset=utf-8"));
app.MapGet("/maintenance.ics", (IStatusStore store) =>
    Results.Text(MaintenanceCalendar.Build(PublicApiMapper.ForPublic(store)), "text/calendar; charset=utf-8"));

app.MapCheckApi();
app.MapOperatorApi();
app.MapRazorPages();

app.Run();

public partial class Program;
