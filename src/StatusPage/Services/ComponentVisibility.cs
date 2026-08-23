using StatusPage.Domain;

namespace StatusPage.Services;

public static class ComponentVisibility
{
    public static bool IsInternalLeaf(Component component, IEnumerable<StatusCheck> checks)
    {
        if (component.Group)
        {
            return false;
        }

        var enabled = checks.Where(c => c.Enabled && c.ComponentId == component.Id).ToList();
        return enabled.Count > 0 && enabled.All(InternalHost.IsInternalCheck);
    }

    /// <summary>
    /// Drop internal host:port leaves from an anonymous public snapshot.
    /// Groups with no remaining public children are removed. Incidents that
    /// only named internal leaves are removed; mixed incidents keep public ids.
    /// </summary>
    public static void RemoveInternal(StatusPageState state, IEnumerable<StatusCheck> checks)
    {
        var checkList = checks.ToList();
        var internalIds = state.Components
            .Where(c => IsInternalLeaf(c, checkList))
            .Select(c => c.Id)
            .ToHashSet(StringComparer.Ordinal);

        if (internalIds.Count == 0)
        {
            return;
        }

        state.Components.RemoveAll(c => internalIds.Contains(c.Id));
        state.Components.RemoveAll(c =>
            c.Group && state.Components.All(child => child.GroupId != c.Id));

        FilterIncidents(state.Incidents, internalIds);
        FilterIncidents(state.ScheduledMaintenances, internalIds);

        foreach (var group in state.Components.Where(c => c.Group))
        {
            var children = state.Components.Where(c => c.GroupId == group.Id).Select(c => c.Status);
            group.Status = StatusRollup.Worst(children);
        }
    }

    private static void FilterIncidents(List<Incident> incidents, HashSet<string> internalIds)
    {
        incidents.RemoveAll(incident =>
        {
            if (incident.ComponentIds.Count == 0)
            {
                return false;
            }

            var publicIds = incident.ComponentIds.Where(id => !internalIds.Contains(id)).ToList();
            if (publicIds.Count == 0)
            {
                return true;
            }

            incident.ComponentIds = publicIds;
            return false;
        });
    }
}
