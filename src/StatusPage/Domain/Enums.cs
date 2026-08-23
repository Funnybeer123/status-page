namespace StatusPage.Domain;

public enum ComponentStatus
{
    Operational,
    DegradedPerformance,
    PartialOutage,
    MajorOutage,
    UnderMaintenance
}

public enum PageIndicator
{
    None,
    Minor,
    Major,
    Critical
}

public enum IncidentStatus
{
    Investigating,
    Identified,
    Monitoring,
    Resolved,
    Postmortem,
    Scheduled,
    InProgress,
    Verifying,
    Completed
}

public enum IncidentImpact
{
    None,
    Minor,
    Major,
    Critical,
    Maintenance
}

public enum CheckType
{
    Http,
    Https,
    Tcp
}

public enum CheckResultStatus
{
    Ok,
    Fail
}

public enum CheckState
{
    Up,
    Down
}

public static class DomainEnums
{
    public static string ApiValue(this ComponentStatus status) => status switch
    {
        ComponentStatus.Operational => "operational",
        ComponentStatus.DegradedPerformance => "degraded_performance",
        ComponentStatus.PartialOutage => "partial_outage",
        ComponentStatus.MajorOutage => "major_outage",
        ComponentStatus.UnderMaintenance => "under_maintenance",
        _ => "operational"
    };

    public static string ApiValue(this PageIndicator indicator) => indicator switch
    {
        PageIndicator.None => "none",
        PageIndicator.Minor => "minor",
        PageIndicator.Major => "major",
        PageIndicator.Critical => "critical",
        _ => "none"
    };

    public static string ApiValue(this IncidentStatus status) => status switch
    {
        IncidentStatus.Investigating => "investigating",
        IncidentStatus.Identified => "identified",
        IncidentStatus.Monitoring => "monitoring",
        IncidentStatus.Resolved => "resolved",
        IncidentStatus.Postmortem => "postmortem",
        IncidentStatus.Scheduled => "scheduled",
        IncidentStatus.InProgress => "in_progress",
        IncidentStatus.Verifying => "verifying",
        IncidentStatus.Completed => "completed",
        _ => "investigating"
    };

    public static string ApiValue(this IncidentImpact impact) => impact switch
    {
        IncidentImpact.None => "none",
        IncidentImpact.Minor => "minor",
        IncidentImpact.Major => "major",
        IncidentImpact.Critical => "critical",
        IncidentImpact.Maintenance => "maintenance",
        _ => "none"
    };

    public static string ApiValue(this CheckType type) => type switch
    {
        CheckType.Http => "http",
        CheckType.Https => "https",
        CheckType.Tcp => "tcp",
        _ => "http"
    };

    public static string ApiValue(this CheckResultStatus status) =>
        status == CheckResultStatus.Ok ? "ok" : "fail";

    public static string ApiValue(this CheckState state) =>
        state == CheckState.Up ? "Up" : "Down";

    public static bool TryParseComponentStatus(string? value, out ComponentStatus status)
    {
        switch (value?.Trim().ToLowerInvariant())
        {
            case "operational":
                status = ComponentStatus.Operational;
                return true;
            case "degraded_performance":
                status = ComponentStatus.DegradedPerformance;
                return true;
            case "partial_outage":
                status = ComponentStatus.PartialOutage;
                return true;
            case "major_outage":
                status = ComponentStatus.MajorOutage;
                return true;
            case "under_maintenance":
                status = ComponentStatus.UnderMaintenance;
                return true;
            default:
                status = default;
                return false;
        }
    }

    public static bool TryParseIncidentStatus(string? value, out IncidentStatus status)
    {
        status = value?.Trim().ToLowerInvariant() switch
        {
            "investigating" => IncidentStatus.Investigating,
            "identified" => IncidentStatus.Identified,
            "monitoring" => IncidentStatus.Monitoring,
            "resolved" => IncidentStatus.Resolved,
            "postmortem" => IncidentStatus.Postmortem,
            "scheduled" => IncidentStatus.Scheduled,
            "in_progress" => IncidentStatus.InProgress,
            "verifying" => IncidentStatus.Verifying,
            "completed" => IncidentStatus.Completed,
            _ => default
        };
        return value is not null && Enum.IsDefined(status) &&
               value.Trim().ToLowerInvariant() is
                   "investigating" or "identified" or "monitoring" or "resolved" or "postmortem"
                   or "scheduled" or "in_progress" or "verifying" or "completed";
    }

    public static bool TryParseIncidentImpact(string? value, out IncidentImpact impact)
    {
        impact = value?.Trim().ToLowerInvariant() switch
        {
            "none" => IncidentImpact.None,
            "minor" => IncidentImpact.Minor,
            "major" => IncidentImpact.Major,
            "critical" => IncidentImpact.Critical,
            "maintenance" => IncidentImpact.Maintenance,
            _ => default
        };
        return value is not null &&
               value.Trim().ToLowerInvariant() is "none" or "minor" or "major" or "critical" or "maintenance";
    }

    public static bool TryParseCheckType(string? value, out CheckType type)
    {
        type = value?.Trim().ToLowerInvariant() switch
        {
            "http" => CheckType.Http,
            "https" => CheckType.Https,
            "tcp" => CheckType.Tcp,
            _ => default
        };
        return value is not null && value.Trim().ToLowerInvariant() is "http" or "https" or "tcp";
    }

    public static bool IsUnresolvedIncident(this IncidentStatus status) =>
        status is IncidentStatus.Investigating or IncidentStatus.Identified or IncidentStatus.Monitoring;

    public static bool IsActiveMaintenance(this IncidentStatus status) =>
        status is IncidentStatus.Scheduled or IncidentStatus.InProgress or IncidentStatus.Verifying;
}
