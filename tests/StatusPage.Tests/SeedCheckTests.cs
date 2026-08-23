using StatusPage.Contracts;
using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Tests;

public class SeedCheckTests
{
    [Fact]
    public void Seed_includes_locked_azure_ado_and_github_https_checks()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "checks.seed.json");
        Assert.True(File.Exists(path), $"Missing seed file at {path}");

        var checks = CheckConfigStore.Load(path, DateTimeOffset.UtcNow);
        AssertHttps(
            checks,
            "azure-status",
            "https://azure.status.microsoft/status/feed/");
        AssertHttps(
            checks,
            "azure-devops-status",
            "https://status.dev.azure.com/_apis/status/health?api-version=7.1-preview.1");
        AssertHttps(
            checks,
            "github-status",
            "https://www.githubstatus.com/api/v2/status.json");

        Assert.DoesNotContain(checks, c =>
            c.Target.Url == "https://example.com"
            || c.Target.Url == "https://devopsinc-status-fb123.azurestaticapps.net/"
            || (c.Target.Url?.Contains("management.azure.com", StringComparison.OrdinalIgnoreCase) ?? false));
    }

    [Fact]
    public void Demo_seed_has_locked_real_platform_leaves()
    {
        var state = DemoSeed.Create("http://localhost:5080", DateTimeOffset.UtcNow);
        Assert.Contains(state.Components, c => c.Id == "azure-status" && c.Name == "Microsoft Azure" && !c.Group);
        Assert.Contains(state.Components, c => c.Id == "azure-devops-status" && c.Name == "Azure DevOps" && !c.Group);
        Assert.Contains(state.Components, c => c.Id == "github-status" && c.Name == "GitHub" && !c.Group);
        Assert.Contains(state.Components, c => c.Id == "cloud-cost-agent" && c.Group);
        Assert.Contains(state.Components, c => c.Id == "devops-eia-box" && c.Group);
        Assert.DoesNotContain(state.Components, c => c.Id is "example-com" or "cca-api");
    }

    private static void AssertHttps(IReadOnlyList<StatusCheck> checks, string componentId, string url)
    {
        var check = Assert.Single(checks, c => c.ComponentId == componentId);
        Assert.Equal(CheckType.Https, check.Type);
        Assert.True(check.Enabled);
        Assert.Equal(url, check.Target.Url);
        Assert.Equal(60, check.IntervalSeconds);
        Assert.Equal(10, check.TimeoutSeconds);
        Assert.Equal(CheckContract.DefaultFailureThreshold, check.FailureThreshold);
        Assert.Equal(CheckContract.DefaultSuccessThreshold, check.SuccessThreshold);
        Assert.Equal([200], check.Http.ExpectedStatus);
        Assert.True(string.IsNullOrEmpty(check.Http.BodyContains));
    }
}
