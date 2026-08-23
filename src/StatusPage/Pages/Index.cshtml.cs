using Microsoft.AspNetCore.Mvc.RazorPages;
using StatusPage.Api;
using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Pages;

public class IndexModel(IStatusStore store, ICheckResultStore results) : PageModel
{
    public StatusPageInfo PageInfo { get; private set; } = new();
    public PageStatus Overall { get; private set; } = new(PageIndicator.None, "All Systems Operational", "All Systems Operational");
    public IReadOnlyList<ComponentGroupView> ComponentGroups { get; private set; } = [];
    public IReadOnlyList<Incident> ActiveIncidents { get; private set; } = [];
    public IReadOnlyList<Incident> ScheduledMaintenances { get; private set; } = [];
    public IReadOnlyList<HistoryDay> History { get; private set; } = [];

    public void OnGet()
    {
        var state = store.Snapshot();
        PublicApiMapper.MapCheckStatuses(state, store.ComponentCheckStatuses());
        ComponentVisibility.RemoveInternal(state, store.ListChecks());
        var now = DateTimeOffset.UtcNow;
        PageInfo = state.Page;
        Overall = StatusRollup.FromComponents(state.Components);
        ActiveIncidents = PublicApiMapper.ActiveIncidents(state).ToList();
        ScheduledMaintenances = PublicApiMapper.ActiveMaintenances(state).ToList();

        var childrenByGroup = state.Components
            .Where(c => !c.Group && c.GroupId is not null)
            .GroupBy(c => c.GroupId!)
            .ToDictionary(g => g.Key, g => g.OrderBy(c => c.Position).ThenBy(c => c.Name).ToList());

        var groups = new List<ComponentGroupView>();
        foreach (var group in state.Components.Where(c => c.Group).OrderBy(c => c.Position))
        {
            groups.Add(new ComponentGroupView(group, childrenByGroup.GetValueOrDefault(group.Id, [])));
        }

        var ungrouped = state.Components
            .Where(c => !c.Group && c.GroupId is null)
            .OrderBy(c => c.Position)
            .ThenBy(c => c.Name)
            .ToList();
        if (ungrouped.Count > 0)
        {
            groups.Add(new ComponentGroupView(
                new Component { Id = "ungrouped", Name = "Monitored endpoints", Group = true, Status = StatusRollup.Worst(ungrouped.Select(c => c.Status)) },
                ungrouped));
        }

        ComponentGroups = groups;

        var past = PublicApiMapper.PastIncidents(state, now, CheckResultStore.PublicBarDays).ToList();
        var samples = results.List();
        var publicChecks = store.ListChecks();
        History = Enumerable.Range(0, CheckResultStore.PublicBarDays)
            .Select(offset =>
            {
                var day = DateOnly.FromDateTime(now.UtcDateTime.Date.AddDays(-offset));
                var items = past.Where(i => DateOnly.FromDateTime((i.ResolvedAt ?? i.UpdatedAt).UtcDateTime) == day).ToList();
                var probeFailed = PublicUptime.DayFailed(samples, publicChecks, day);
                return new HistoryDay(day, items, probeFailed);
            })
            .ToList();
    }
}

public sealed record ComponentGroupView(Component Group, IReadOnlyList<Component> Children);

public sealed record HistoryDay(DateOnly Day, IReadOnlyList<Incident> Incidents, bool ProbeFailed);
