using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
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

        Incident = incident;
        return Page();
    }
}
