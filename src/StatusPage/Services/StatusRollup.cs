using StatusPage.Domain;

namespace StatusPage.Services;

/// <summary>
/// Statuspage-compatible rollup of leaf component statuses to a page indicator.
/// See https://support.atlassian.com/statuspage/docs/top-level-status-and-incident-impact-calculations/
/// </summary>
public static class StatusRollup
{
    public static PageStatus FromComponents(IEnumerable<Component> components)
    {
        var leaves = components.Where(c => !c.Group).Select(c => c.Status).ToList();
        return FromStatuses(leaves);
    }

    public static PageStatus FromStatuses(IReadOnlyList<ComponentStatus> statuses)
    {
        if (statuses.Count == 0)
        {
            return Operational();
        }

        if (statuses.Count == 1)
        {
            return statuses[0] switch
            {
                ComponentStatus.Operational => Operational(),
                ComponentStatus.UnderMaintenance => Maintenance(),
                ComponentStatus.DegradedPerformance => new PageStatus(
                    PageIndicator.Minor, "Partially Degraded Service", "Partial Outage"),
                ComponentStatus.PartialOutage => new PageStatus(
                    PageIndicator.Major, "Partial System Outage", "Partial Outage"),
                ComponentStatus.MajorOutage => new PageStatus(
                    PageIndicator.Critical, "Major System Outage", "Major Outage"),
                _ => Operational()
            };
        }

        bool All(ComponentStatus status) => statuses.All(s => s == status);
        bool Any(ComponentStatus status) => statuses.Any(s => s == status);

        if (All(ComponentStatus.Operational))
        {
            return Operational();
        }

        if (All(ComponentStatus.MajorOutage))
        {
            return new PageStatus(PageIndicator.Critical, "Major System Outage", "Major Outage");
        }

        if (All(ComponentStatus.PartialOutage))
        {
            return new PageStatus(PageIndicator.Major, "Partial System Outage", "Partial Outage");
        }

        if (Any(ComponentStatus.MajorOutage))
        {
            return new PageStatus(PageIndicator.Major, "Partial System Outage", "Partial Outage");
        }

        if (Any(ComponentStatus.PartialOutage))
        {
            return new PageStatus(PageIndicator.Minor, "Minor Service Outage", "Partial Outage");
        }

        if (All(ComponentStatus.DegradedPerformance))
        {
            return new PageStatus(PageIndicator.Minor, "Degraded System Service", "Partial Outage");
        }

        if (Any(ComponentStatus.DegradedPerformance))
        {
            return new PageStatus(PageIndicator.Minor, "Partially Degraded Service", "Partial Outage");
        }

        if (Any(ComponentStatus.UnderMaintenance))
        {
            return Maintenance();
        }

        return Operational();
    }

    public static ComponentStatus Worst(IEnumerable<ComponentStatus> statuses)
    {
        var worst = ComponentStatus.Operational;
        foreach (var status in statuses)
        {
            if (Rank(status) > Rank(worst))
            {
                worst = status;
            }
        }

        return worst;
    }

    public static ComponentStatus FromCheckStreak(int consecutiveFailures, int consecutiveSuccesses, int failureThreshold, int successThreshold)
    {
        if (consecutiveSuccesses >= Math.Max(1, successThreshold))
        {
            return ComponentStatus.Operational;
        }

        if (consecutiveFailures <= 0)
        {
            return ComponentStatus.Operational;
        }

        var threshold = Math.Max(1, failureThreshold);
        if (consecutiveFailures >= threshold)
        {
            return ComponentStatus.MajorOutage;
        }

        if (consecutiveFailures >= Math.Max(1, (int)Math.Ceiling(threshold * 2.0 / 3.0)))
        {
            return ComponentStatus.PartialOutage;
        }

        return ComponentStatus.DegradedPerformance;
    }

    private static int Rank(ComponentStatus status) => status switch
    {
        ComponentStatus.MajorOutage => 4,
        ComponentStatus.PartialOutage => 3,
        ComponentStatus.DegradedPerformance => 2,
        ComponentStatus.UnderMaintenance => 1,
        _ => 0
    };

    private static PageStatus Operational() =>
        new(PageIndicator.None, "All Systems Operational", "All Systems Operational");

    private static PageStatus Maintenance() =>
        new(PageIndicator.None, "System Under Maintenance", "Under Maintenance");
}
