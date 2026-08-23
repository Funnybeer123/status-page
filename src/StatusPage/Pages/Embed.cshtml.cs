using Microsoft.AspNetCore.Mvc.RazorPages;
using StatusPage.Api;
using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Pages;

public class EmbedModel(IStatusStore store, ICheckResultStore results) : PageModel
{
    public StatusPageInfo PageInfo { get; private set; } = new();
    public PageStatus Overall { get; private set; } = new(PageIndicator.None, "All Systems Operational", "All Systems Operational");
    public IReadOnlyList<Component> Components { get; private set; } = [];
    public IReadOnlyDictionary<string, LeafUptime> LeafUptime { get; private set; } =
        new Dictionary<string, LeafUptime>(StringComparer.Ordinal);

    public void OnGet()
    {
        var state = PublicApiMapper.ForPublic(store);
        PageInfo = state.Page;
        Overall = StatusRollup.FromComponents(state.Components);
        Components = state.Components
            .Where(c => !c.Group)
            .OrderBy(c => c.Position)
            .ThenBy(c => c.Name)
            .ToList();
        LeafUptime = PublicUptime.ForPublicLeaves(state, store.ListChecks(), results.List(), DateTimeOffset.UtcNow)
            .ToDictionary(l => l.Id, StringComparer.Ordinal);
    }
}
