using StatusPage.Domain;

namespace StatusPage.Services;

public static class DemoSeed
{
    public static StatusPageState Create(string publicUrl, DateTimeOffset now)
    {
        var page = new StatusPageInfo
        {
            Id = "local-status",
            Name = "Status",
            Url = publicUrl.TrimEnd('/'),
            TimeZone = "Etc/UTC",
            UpdatedAt = now
        };

        var cloud = Group("cloud-cost-agent", "Cloud Cost Agent", 1, now,
            "FinOps agent that reads Azure spend and recommendations.");
        var azure = Leaf("azure", "Microsoft Azure", cloud.Id, 1, now,
            "Official public Azure status page.");

        var devops = Group("devops-eia-box", "DevOps Engineer-in-a-Box", 2, now,
            "Agent that drafts and applies changes through Azure DevOps and GitHub.");
        var ado = Leaf("azure-devops", "Azure DevOps", devops.Id, 1, now,
            "Official public Azure DevOps status page.");
        var github = Leaf("github", "GitHub", devops.Id, 2, now,
            "GitHub public Statuspage v2 status API.");

        return new StatusPageState
        {
            Page = page,
            Components = [cloud, azure, devops, ado, github],
            Incidents = [],
            ScheduledMaintenances = []
        };
    }

    public static void BindSelfHealthChecks(IEnumerable<StatusCheck> checks, string healthUrl)
    {
        foreach (var check in checks.Where(c => c.Target.Url == "__SELF_HEALTH__"))
        {
            check.Target.Url = healthUrl;
            check.Type = CheckType.Http;
        }
    }

    private static Component Group(string id, string name, int position, DateTimeOffset now, string description) =>
        new()
        {
            Id = id,
            Name = name,
            Description = description,
            Group = true,
            Position = position,
            CreatedAt = now.AddDays(-30),
            UpdatedAt = now
        };

    private static Component Leaf(string id, string name, string? groupId, int position, DateTimeOffset now, string description) =>
        new()
        {
            Id = id,
            Name = name,
            Description = description,
            GroupId = groupId,
            Position = position,
            CreatedAt = now.AddDays(-30),
            UpdatedAt = now
        };
}
