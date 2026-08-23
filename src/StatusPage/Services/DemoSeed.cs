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
            "FinOps agent for cloud spend visibility and recommendations.");
        var cloudApi = Leaf("cca-api", "API", cloud.Id, 1, now, "Public and internal Cloud Cost Agent APIs.");
        var cloudDash = Leaf("cca-dashboard", "Dashboard", cloud.Id, 2, now, "Cost explorer and reporting UI.");
        var cloudIngest = Leaf("cca-ingestion", "Ingestion", cloud.Id, 3, now, "Billing export and usage ingestion.");

        var devops = Group("devops-eia-box", "DevOps Engineer-in-a-Box", 2, now,
            "Agent that drafts and applies DevOps changes.");
        var devopsApi = Leaf("deib-api", "API", devops.Id, 1, now, "Control plane API.");
        var devopsRunner = Leaf("deib-runner", "Runner", devops.Id, 2, now, "Job execution workers.");
        var devopsPortal = Leaf("deib-portal", "Portal", devops.Id, 3, now, "Operator portal.");

        var example = Leaf("example-com", "example.com", null, 3, now,
            "Sample HTTPS check against a public site. Not a product.");
        var local = Leaf("local-health", "Local status page", null, 4, now,
            "Sample HTTP check against this process (/health).");

        var resolved = new Incident
        {
            Id = "inc-cca-api-timeouts",
            Name = "Elevated API timeouts in Cloud Cost Agent",
            Status = IncidentStatus.Resolved,
            Impact = IncidentImpact.Minor,
            ComponentIds = [cloudApi.Id],
            CreatedAt = now.AddDays(-4).AddHours(-3),
            UpdatedAt = now.AddDays(-4),
            ResolvedAt = now.AddDays(-4),
            Updates =
            [
                Update("upd-cca-3", "inc-cca-api-timeouts", IncidentStatus.Resolved,
                    "API latency returned to normal. Residual queued ingest jobs have drained.",
                    now.AddDays(-4)),
                Update("upd-cca-2", "inc-cca-api-timeouts", IncidentStatus.Monitoring,
                    "Connection pool limits were raised. Watching error rates.",
                    now.AddDays(-4).AddHours(-1)),
                Update("upd-cca-1", "inc-cca-api-timeouts", IncidentStatus.Investigating,
                    "We are investigating elevated 504s on the Cloud Cost Agent API.",
                    now.AddDays(-4).AddHours(-3))
            ]
        };

        var maintenance = new Incident
        {
            Id = "mnt-cca-ingest",
            Name = "Cloud Cost Agent ingestion window",
            Status = IncidentStatus.Scheduled,
            Impact = IncidentImpact.Maintenance,
            ComponentIds = [cloudIngest.Id],
            CreatedAt = now.AddHours(-6),
            UpdatedAt = now.AddHours(-6),
            ScheduledFor = now.AddDays(1).AddHours(2),
            ScheduledUntil = now.AddDays(1).AddHours(4),
            Updates =
            [
                Update("upd-mnt-1", "mnt-cca-ingest", IncidentStatus.Scheduled,
                    "Scheduled maintenance to rotate ingestion credentials. Brief delays in new cost data are expected.",
                    now.AddHours(-6))
            ]
        };

        return new StatusPageState
        {
            Page = page,
            Components =
            [
                cloud, cloudApi, cloudDash, cloudIngest,
                devops, devopsApi, devopsRunner, devopsPortal,
                example, local
            ],
            Incidents = [resolved],
            ScheduledMaintenances = [maintenance]
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

    private static IncidentUpdate Update(string id, string incidentId, IncidentStatus status, string body, DateTimeOffset at) =>
        new()
        {
            Id = id,
            IncidentId = incidentId,
            Status = status,
            Body = body,
            CreatedAt = at,
            UpdatedAt = at,
            DisplayAt = at
        };
}
