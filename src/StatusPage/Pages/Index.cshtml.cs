using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using StatusPage.Api;
using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Pages;

public class IndexModel(
    IStatusStore store,
    ICheckResultStore results,
    IProblemReportStore reports,
    IReportRateLimiter reportLimiter) : PageModel
{
    public StatusPageInfo PageInfo { get; private set; } = new();
    public PageStatus Overall { get; private set; } = new(PageIndicator.None, "All Systems Operational", "All Systems Operational");
    public IReadOnlyList<ComponentGroupView> ComponentGroups { get; private set; } = [];
    public IReadOnlyList<Incident> ActiveIncidents { get; private set; } = [];
    public IReadOnlyList<Incident> ScheduledMaintenances { get; private set; } = [];
    public IReadOnlyList<HistoryDay> History { get; private set; } = [];
    public IReadOnlyDictionary<string, LeafUptime> LeafUptime { get; private set; } =
        new Dictionary<string, LeafUptime>(StringComparer.Ordinal);
    public double? PublicUptimePercent { get; private set; }
    public bool ReportThanks { get; private set; }
    public string? ReportError { get; private set; }

    public void OnGet(int? reported = null)
    {
        ReportThanks = reported == 1;
        Load();
    }

    public IActionResult OnPostReport(string? title, string? body)
    {
        if (!reportLimiter.TryAcquire(ReportEndpoints.ClientKey(HttpContext)))
        {
            Response.StatusCode = StatusCodes.Status429TooManyRequests;
            ReportError = "Too many reports from this address. Try again later.";
            Load();
            return Page();
        }

        try
        {
            reports.Create(title, body);
            return Redirect("/?reported=1#report");
        }
        catch (ArgumentException ex)
        {
            ReportError = ex.Message;
            Load();
            return Page();
        }
    }

    private void Load()
    {
        var state = PublicApiMapper.ForPublic(store);
        var now = DateTimeOffset.UtcNow;
        var samples = results.List();
        var checks = store.ListChecks();
        var leaves = PublicUptime.ForPublicLeaves(state, checks, samples, now);
        LeafUptime = leaves.ToDictionary(l => l.Id, StringComparer.Ordinal);
        PublicUptimePercent = PublicUptime.Percent(leaves.Sum(l => l.Ok), leaves.Sum(l => l.Fail));
        PageInfo = state.Page;
        ViewData["PageTimeZone"] = state.Page.TimeZone;
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
        History = PublicUptime.UtcDays(now)
            .Select(day =>
            {
                var items = past.Where(i => DateOnly.FromDateTime((i.ResolvedAt ?? i.UpdatedAt).UtcDateTime) == day).ToList();
                var probeFailed = PublicUptime.DayFailed(samples, checks, day);
                var hasSamples = PublicUptime.DayHasSamples(samples, checks, day);
                return new HistoryDay(day, items, probeFailed, hasSamples);
            })
            .ToList();
    }
}

public sealed record ComponentGroupView(Component Group, IReadOnlyList<Component> Children);

public sealed record HistoryDay(DateOnly Day, IReadOnlyList<Incident> Incidents, bool ProbeFailed, bool HasSamples);
