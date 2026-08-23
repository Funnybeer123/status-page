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
    public string Target { get; set; } = "";
    public CheckType Type { get; set; } = CheckType.Https;
    public int IntervalSeconds { get; set; } = 60;
    public int TimeoutSeconds { get; set; } = 10;
    public int ExpectedStatus { get; set; } = 200;
    public string? Keyword { get; set; }
    public string ComponentId { get; set; } = "";
    public int FailureThreshold { get; set; } = 3;
    public int SuccessThreshold { get; set; } = 1;
    public int ConsecutiveFailures { get; set; }
    public int ConsecutiveSuccesses { get; set; }
    public DateTimeOffset? LastRunAt { get; set; }
    public DateTimeOffset? NextRunAt { get; set; }
    public bool? LastOk { get; set; }
    public string? LastMessage { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed record PageStatus(
    PageIndicator Indicator,
    string Description,
    string Banner);

public sealed record CreateCheckRequest(
    string Name,
    string Target,
    string? Type,
    int? IntervalSeconds,
    int? TimeoutSeconds,
    int? ExpectedStatus,
    string? Keyword,
    string? ComponentId,
    string? ComponentName,
    string? GroupId,
    int? FailureThreshold,
    int? SuccessThreshold);

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
