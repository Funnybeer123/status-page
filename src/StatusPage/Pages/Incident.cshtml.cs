using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using StatusPage.Api;
using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Pages;

public class IncidentModel(IStatusStore store) : PageModel
{
    public Incident Incident { get; private set; } = new();

    public IActionResult OnGet(string id)
    {
        var state = store.Snapshot();
        var incident = state.Incidents.Concat(state.ScheduledMaintenances).FirstOrDefault(i => i.Id == id);
        if (incident is null)
        {
            return NotFound();
        }

        if (!OperatorAuth.IsOperator(HttpContext) && incident.ComponentIds.Count > 0)
        {
            var checks = store.ListChecks();
            var publicIds = incident.ComponentIds.Where(componentId =>
            {
                var component = state.Components.FirstOrDefault(c => c.Id == componentId);
                return component is null || !ComponentVisibility.IsInternalLeaf(component, checks);
            }).ToList();
            if (publicIds.Count == 0)
            {
                return NotFound();
            }
        }

        Incident = incident;
        return Page();
    }
}
