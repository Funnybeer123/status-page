namespace StatusPage.Tests;

public class StaticSnapshotTests
{
    [Fact]
    public void Export_script_and_workflow_lock_the_three_public_urls()
    {
        var root = FindRepoRoot();
        var script = File.ReadAllText(Path.Combine(root, "scripts", "export-static.sh"));
        var workflow = File.ReadAllText(Path.Combine(root, ".github", "workflows", "status-snapshot.yml"));

        Assert.Contains("https://azure.status.microsoft/status/feed/", script);
        Assert.Contains("https://status.dev.azure.com/_apis/status/health?api-version=7.1-preview.1", script);
        Assert.Contains("https://www.githubstatus.com/api/v2/status.json", script);
        Assert.Contains("exit 0", script);
        Assert.DoesNotContain("devopsinc-status-fb123.azurestaticapps.net", script);
        Assert.DoesNotContain("management.azure.com", script);

        Assert.Contains("*/15 * * * *", workflow);
        Assert.Contains("workflow_dispatch", workflow);
        Assert.DoesNotContain("\n  pull_request:", workflow.Replace("\r", ""));
        Assert.Contains("AZURE_STATIC_WEB_APPS_API_TOKEN is not set; skipping Static Web Apps deploy.", workflow);
        Assert.DoesNotContain("github_pat_", workflow);
        Assert.DoesNotContain("00000", workflow);
    }

    private static string FindRepoRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            if (File.Exists(Path.Combine(dir.FullName, "scripts", "export-static.sh")))
            {
                return dir.FullName;
            }

            dir = dir.Parent;
        }

        throw new DirectoryNotFoundException("Could not find repo root from " + AppContext.BaseDirectory);
    }
}
