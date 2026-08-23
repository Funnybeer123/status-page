using StatusPage.Api;
using StatusPage.Domain;
using StatusPage.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRazorPages();
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.WriteIndented = true;
    options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});

var publicUrl = builder.Configuration["StatusPage:PublicUrl"] ?? "http://localhost:5080";
var selfHealth = builder.Configuration["StatusPage:SelfHealthUrl"]
                 ?? $"{publicUrl.TrimEnd('/')}/health";
var seed = DemoSeed.Create(publicUrl, DateTimeOffset.UtcNow);

var seedPath = Path.Combine(builder.Environment.ContentRootPath, "Data", "checks.seed.json");
var runtimePath = builder.Configuration["StatusPage:ChecksPath"]
                  ?? Path.Combine(builder.Environment.ContentRootPath, "data", "checks.json");
var checks = File.Exists(runtimePath)
    ? CheckConfigStore.Load(runtimePath, DateTimeOffset.UtcNow)
    : CheckConfigStore.Load(seedPath, DateTimeOffset.UtcNow);
DemoSeed.BindSelfHealthChecks(checks, selfHealth);
seed.Checks = checks;

builder.Services.AddSingleton<IStatusStore>(_ =>
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
    }));
builder.Services.AddSingleton<CheckRunner>();
builder.Services.AddHttpClient("StatusChecks", client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("status-page-check/1.0");
});

if (builder.Configuration.GetValue("StatusPage:EnableCheckWorker", true))
{
    builder.Services.AddHostedService<CheckWorker>();
}

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
}

app.UseStaticFiles();
app.UseRouting();

app.MapGet("/health", () => Results.Text("ok", "text/plain"));

app.MapGet("/api/v2/summary.json", (IStatusStore store) => Results.Json(PublicApiMapper.Summary(ForPublic(store))));
app.MapGet("/api/v2/status.json", (IStatusStore store) => Results.Json(PublicApiMapper.Status(ForPublic(store))));
app.MapGet("/api/v2/components.json", (IStatusStore store) => Results.Json(PublicApiMapper.Components(ForPublic(store))));

static StatusPageState ForPublic(IStatusStore store)
{
    var state = store.Snapshot();
    PublicApiMapper.MapCheckStatuses(state, store.ComponentCheckStatuses());
    return state;
}

app.MapCheckApi();
app.MapOperatorApi();
app.MapRazorPages();

app.Run();

public partial class Program;
