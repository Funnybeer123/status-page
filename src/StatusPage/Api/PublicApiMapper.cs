using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Api;

public static class PublicApiMapper
{
    /// <summary>
    /// Maps Status Check Builder rollup onto public components.
    /// Probe results stay ok/fail; only the typed component snapshot is applied.
    /// Operator under_maintenance is left alone. Zero checks leave operator status.
    /// </summary>
    public static void MapCheckStatuses(StatusPageState state, IEnumerable<ComponentCheckStatus> checkStatuses)
    {
        var byId = checkStatuses.ToDictionary(s => s.ComponentId, StringComparer.Ordinal);
        foreach (var component in state.Components.Where(c => !c.Group))
        {
            if (component.Status == ComponentStatus.UnderMaintenance
                || component.ManualStatus == ComponentStatus.UnderMaintenance)
            {
                continue;
            }

            if (byId.TryGetValue(component.Id, out var row) && row.CheckCount > 0)
            {
                component.Status = row.Status;
                component.UpdatedAt = row.UpdatedAtUtc;
            }
        }

        foreach (var group in state.Components.Where(c => c.Group))
        {
            var children = state.Components.Where(c => c.GroupId == group.Id).Select(c => c.Status);
            group.Status = StatusRollup.Worst(children);
        }
    }

    public static object Summary(StatusPageState state)
    {
        var status = StatusRollup.FromComponents(state.Components);
        return new
        {
            page = Page(state.Page),
            status = Status(status),
            components = state.Components.OrderBy(c => c.Position).ThenBy(c => c.Name).Select(c => Component(state.Page.Id, c)),
            incidents = ActiveIncidents(state).Select(i => Incident(state, i)),
            scheduled_maintenances = ActiveMaintenances(state).Select(i => Incident(state, i))
        };
    }

    public static object Status(StatusPageState state)
    {
        var status = StatusRollup.FromComponents(state.Components);
        return new
        {
            page = Page(state.Page),
            status = Status(status)
        };
    }

    public static object Components(StatusPageState state) => new
    {
        page = Page(state.Page),
        components = state.Components.OrderBy(c => c.Position).ThenBy(c => c.Name).Select(c => Component(state.Page.Id, c))
    };

    public static IEnumerable<Incident> ActiveIncidents(StatusPageState state) =>
        state.Incidents.Where(i => i.Status.IsUnresolvedIncident()).OrderByDescending(i => i.UpdatedAt);

    public static IEnumerable<Incident> ActiveMaintenances(StatusPageState state) =>
        state.ScheduledMaintenances.Where(i => i.Status.IsActiveMaintenance()).OrderBy(i => i.ScheduledFor ?? i.UpdatedAt);

    public static IEnumerable<Incident> PastIncidents(StatusPageState state, DateTimeOffset now, int days)
    {
        var start = now.AddDays(-days);
        return state.Incidents
            .Where(i => !i.Status.IsUnresolvedIncident())
            .Where(i => (i.ResolvedAt ?? i.UpdatedAt) >= start)
            .OrderByDescending(i => i.ResolvedAt ?? i.UpdatedAt);
    }

    private static object Page(StatusPageInfo page) => new
    {
        id = page.Id,
        name = page.Name,
        url = page.Url,
        time_zone = page.TimeZone,
        updated_at = Iso(page.UpdatedAt)
    };

    private static object Status(PageStatus status) => new
    {
        indicator = status.Indicator.ApiValue(),
        description = status.Description
    };

    private static object Component(string pageId, Component component) => new
    {
        id = component.Id,
        name = component.Name,
        status = component.Status.ApiValue(),
        created_at = Iso(component.CreatedAt),
        updated_at = Iso(component.UpdatedAt),
        position = component.Position,
        description = component.Description,
        showcase = component.Showcase,
        start_date = (string?)null,
        group_id = component.GroupId,
        page_id = pageId,
        group = component.Group,
        only_show_if_degraded = component.OnlyShowIfDegraded
    };

    private static object Incident(StatusPageState state, Incident incident)
    {
        var affected = state.Components.Where(c => incident.ComponentIds.Contains(c.Id)).ToList();
        var startedAt = incident.ScheduledFor ?? incident.CreatedAt;
        return new
        {
            id = incident.Id,
            name = incident.Name,
            status = incident.Status.ApiValue(),
            impact = incident.Impact.ApiValue(),
            created_at = Iso(incident.CreatedAt),
            updated_at = Iso(incident.UpdatedAt),
            monitoring_at = Iso(incident.MonitoringAt),
            resolved_at = Iso(incident.ResolvedAt),
            started_at = Iso(startedAt),
            scheduled_for = Iso(incident.ScheduledFor),
            scheduled_until = Iso(incident.ScheduledUntil),
            shortlink = $"{state.Page.Url.TrimEnd('/')}/incidents/{incident.Id}",
            page_id = state.Page.Id,
            incident_updates = incident.Updates
                .OrderByDescending(u => u.DisplayAt)
                .Select(u => IncidentUpdate(u, affected)),
            components = affected.Select(c => Component(state.Page.Id, c))
        };
    }

    private static object IncidentUpdate(IncidentUpdate update, IReadOnlyList<Component> affected) => new
    {
        id = update.Id,
        incident_id = update.IncidentId,
        status = update.Status.ApiValue(),
        body = update.Body,
        created_at = Iso(update.CreatedAt),
        updated_at = Iso(update.UpdatedAt),
        display_at = Iso(update.DisplayAt),
        affected_components = affected.Select(AffectedComponent),
        deliver_notifications = false
    };

    private static object AffectedComponent(Component component) => new
    {
        code = component.Id,
        name = component.Name,
        old_status = component.Status.ApiValue(),
        new_status = component.Status.ApiValue()
    };

    public static string Iso(DateTimeOffset value) =>
        value.ToUniversalTime().ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'");

    public static string? Iso(DateTimeOffset? value) => value is null ? null : Iso(value.Value);
}
