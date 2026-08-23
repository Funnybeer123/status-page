using StatusPage.Contracts;
using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Tests;

public class SeedCheckTests
{
    [Fact]
    public void Seed_includes_azure_azure_devops_and_github_https_checks()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "checks.seed.json");
        Assert.True(File.Exists(path), $"Missing seed file at {path}");

        var checks = CheckConfigStore.Load(path, DateTimeOffset.UtcNow);
        AssertHttps(checks, "azure", "https://azure.status.microsoft/en-us/status");
        AssertHttps(checks, "azure-devops", "https://status.dev.azure.com");
        AssertHttps(checks, "github", "https://www.githubstatus.com/api/v2/status.json");
        Assert.DoesNotContain(checks, c => c.Target.Url is "https://example.com" or "__SELF_HEALTH__");
    }

    [Fact]
    public void Demo_seed_has_real_platform_leaves()
    {
        var state = DemoSeed.Create("http://localhost:5080", DateTimeOffset.UtcNow);
        Assert.Contains(state.Components, c => c.Id == "azure" && c.Name == "Microsoft Azure" && !c.Group);
        Assert.Contains(state.Components, c => c.Id == "azure-devops" && c.Name == "Azure DevOps" && !c.Group);
        Assert.Contains(state.Components, c => c.Id == "github" && c.Name == "GitHub" && !c.Group);
        Assert.Contains(state.Components, c => c.Id == "cloud-cost-agent" && c.Group);
        Assert.Contains(state.Components, c => c.Id == "devops-eia-box" && c.Group);
        Assert.DoesNotContain(state.Components, c => c.Id is "example-com" or "local-health" or "cca-api");
    }

    private static void AssertHttps(IReadOnlyList<StatusCheck> checks, string componentId, string url)
    {
        var check = Assert.Single(checks, c => c.ComponentId == componentId);
        Assert.Equal(CheckType.Https, check.Type);
        Assert.True(check.Enabled);
        Assert.Equal(url, check.Target.Url);
        Assert.Equal(CheckContract.DefaultFailureThreshold, check.FailureThreshold);
        Assert.Equal(CheckContract.DefaultSuccessThreshold, check.SuccessThreshold);
        Assert.Equal([200], check.Http.ExpectedStatus);
        Assert.True(string.IsNullOrEmpty(check.Http.BodyContains));
    }
}
