namespace StatusPage.Domain;

public sealed class StatusPageState
{
    public StatusPageInfo Page { get; set; } = new();
    public List<Component> Components { get; set; } = [];
    public List<Incident> Incidents { get; set; } = [];
    public List<Incident> ScheduledMaintenances { get; set; } = [];
    public List<StatusCheck> Checks { get; set; } = [];
}

public sealed class StatusPageInfo
{
    public string Id { get; set; } = "local-status";
    public string Name { get; set; } = "Status";
    public string Url { get; set; } = "http://localhost:5080";
    public string TimeZone { get; set; } = "Etc/UTC";
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class Component
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public ComponentStatus Status { get; set; } = ComponentStatus.Operational;
    public bool Group { get; set; }
    public string? GroupId { get; set; }
    public int Position { get; set; }
    public bool Showcase { get; set; } = true;
    public bool OnlyShowIfDegraded { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    /// <summary>Last operator-set status. Used when the component has no enabled checks.</summary>
    public ComponentStatus ManualStatus { get; set; } = ComponentStatus.Operational;
    public string? AutoIncidentId { get; set; }
}

public sealed class Incident
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public IncidentStatus Status { get; set; } = IncidentStatus.Investigating;
    public IncidentImpact Impact { get; set; } = IncidentImpact.Minor;
    public List<string> ComponentIds { get; set; } = [];
    public List<IncidentUpdate> Updates { get; set; } = [];
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? MonitoringAt { get; set; }
    public DateTimeOffset? ResolvedAt { get; set; }
    public DateTimeOffset? ScheduledFor { get; set; }
    public DateTimeOffset? ScheduledUntil { get; set; }
    public bool AutoFromChecks { get; set; }
}

public sealed class IncidentUpdate
{
    public string Id { get; set; } = "";
    public string IncidentId { get; set; } = "";
    public IncidentStatus Status { get; set; }
    public string Body { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset DisplayAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class StatusCheck
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string ComponentId { get; set; } = "";
    public CheckType Type { get; set; } = CheckType.Https;
    public bool Enabled { get; set; } = true;
    public int IntervalSeconds { get; set; } = 60;
    public int TimeoutSeconds { get; set; } = 10;
    public int FailureThreshold { get; set; } = 3;
    public int SuccessThreshold { get; set; } = 2;
    public CheckTargetSpec Target { get; set; } = new();
    public HttpCheckSpec Http { get; set; } = new();
    public CheckState State { get; set; } = CheckState.Up;
    public int ConsecutiveFailures { get; set; }
    public int ConsecutiveSuccesses { get; set; }
    public DateTimeOffset? NextRunAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public List<CheckResult> Results { get; set; } = [];
    /// <summary>Display title of a create-if-missing leaf. Never the probe <see cref="Name"/>.</summary>
    public string? ComponentName { get; set; }
    public string? ComponentGroupId { get; set; }

    public CheckResult? LastResult => Results.Count == 0 ? null : Results[0];

    public string DisplayTarget =>
        !string.IsNullOrWhiteSpace(Target.Url)
            ? Target.Url!
            : Target.Host is { Length: > 0 } && Target.Port is > 0
                ? $"{Target.Host}:{Target.Port}{Target.Path}"
                : "";
}

public sealed class CheckTargetSpec
{
    public string? Url { get; set; }
    public string? Host { get; set; }
    public int? Port { get; set; }
    public string? Path { get; set; }
}

public sealed class HttpCheckSpec
{
    public string Method { get; set; } = "GET";
    public List<int> ExpectedStatus { get; set; } = [200, 201, 204];
    public string? BodyContains { get; set; }
}

public sealed class CheckResult
{
    public CheckResultStatus Status { get; set; } = CheckResultStatus.Fail;
    public int? HttpStatus { get; set; }
    public int LatencyMs { get; set; }
    public string? Error { get; set; }
    public DateTimeOffset CheckedAtUtc { get; set; }
}

public sealed record PageStatus(
    PageIndicator Indicator,
    string Description,
    string Banner);

public sealed record CreateCheckRequest(
    string Name,
    string ComponentId,
    string? Type,
    bool? Enabled,
    int? IntervalSeconds,
    int? TimeoutSeconds,
    int? FailureThreshold,
    int? SuccessThreshold,
    CheckTargetSpec Target,
    HttpCheckSpec? Http,
    string? ComponentName = null,
    string? GroupId = null);

public sealed record CreateIncidentRequest(
    string Name,
    string? Status,
    string? Impact,
    string Body,
    IReadOnlyList<string>? ComponentIds,
    DateTimeOffset? ScheduledFor,
    DateTimeOffset? ScheduledUntil);

public sealed record UpdateIncidentRequest(
    string? Status,
    string Body,
    IReadOnlyList<string>? ComponentIds,
    IReadOnlyDictionary<string, string>? ComponentStatuses);

public sealed record UpdateComponentRequest(string Status);
