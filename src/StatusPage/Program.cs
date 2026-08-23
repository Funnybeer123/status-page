using StatusPage.Api;
using StatusPage.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRazorPages();
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.WriteIndented = true;
});

var publicUrl = builder.Configuration["StatusPage:PublicUrl"] ?? "http://localhost:5080";
var seed = DemoSeed.Create(publicUrl, DateTimeOffset.UtcNow);
builder.Services.AddSingleton<IStatusStore>(new InMemoryStatusStore(seed));
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

var selfHealth = builder.Configuration["StatusPage:SelfHealthUrl"]
                 ?? $"{publicUrl.TrimEnd('/')}/health";
DemoSeed.BindSelfHealthChecks(seed, selfHealth);

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
}

app.UseStaticFiles();
app.UseRouting();

app.MapGet("/health", () => Results.Text("ok", "text/plain"));

app.MapGet("/api/v2/summary.json", (IStatusStore store) => Results.Json(PublicApiMapper.Summary(store.Snapshot())));
app.MapGet("/api/v2/status.json", (IStatusStore store) => Results.Json(PublicApiMapper.Status(store.Snapshot())));
app.MapGet("/api/v2/components.json", (IStatusStore store) => Results.Json(PublicApiMapper.Components(store.Snapshot())));

app.MapOperatorApi();
app.MapRazorPages();

app.Run();

public partial class Program;