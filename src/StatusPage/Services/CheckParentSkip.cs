using StatusPage.Domain;

namespace StatusPage.Services;

/// <summary>
/// When a parent leaf is Down, the worker and POST /run skip child probes.
/// Hysteresis and auto-incidents do not move. Last child state sticks.
/// Groups do not probe and are not parent leaves.
/// </summary>
public static class CheckParentSkip
{
    public static bool IsActive(StatusCheck check, IEnumerable<Component> components, IEnumerable<StatusCheck> checks) =>
        DownAncestorId(check.ComponentId, components, checks) is not null;

    public static bool IsActive(StatusCheck check, IStatusStore store)
    {
        var state = store.Snapshot();
        return IsActive(check, state.Components, state.Checks);
    }

    public static string? DownAncestorId(
        string componentId,
        IEnumerable<Component> components,
        IEnumerable<StatusCheck> checks)
    {
        var byId = components.ToDictionary(c => c.Id, StringComparer.Ordinal);
        if (!byId.TryGetValue(componentId, out var leaf) || leaf.Group)
        {
            return null;
        }

        var seen = new HashSet<string>(StringComparer.Ordinal);
        var parentId = leaf.ParentId;
        var checkList = checks as IReadOnlyList<StatusCheck> ?? checks.ToList();
        while (!string.IsNullOrWhiteSpace(parentId) && seen.Add(parentId))
        {
            if (!byId.TryGetValue(parentId, out var parent) || parent.Group)
            {
                return null;
            }

            if (IsLeafDown(parent, checkList))
            {
                return parent.Id;
            }

            parentId = parent.ParentId;
        }

        return null;
    }

    public static bool IsLeafDown(Component leaf, IEnumerable<StatusCheck> checks)
    {
        if (leaf.Group)
        {
            return false;
        }

        var states = checks
            .Where(c => c.Enabled && c.ComponentId == leaf.Id)
            .Select(c => c.State)
            .ToList();
        return states.Count > 0 && states.All(s => s == CheckState.Down);
    }
}
