using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using StatusPage.Api;
using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Pages;

public class OperatorModel(IStatusStore store, IConfiguration configuration, IHostEnvironment environment, IAuditLog audit) : PageModel
{
    public IReadOnlyList<Component> Groups { get; private set; } = [];
    public IReadOnlyList<OperatorComponentRow> Components { get; private set; } = [];
    public IReadOnlyList<StatusCheck> Checks { get; private set; } = [];
    public IReadOnlyList<Incident> Incidents { get; private set; } = [];
    public IReadOnlyList<ConnectorSnapshot> Connectors { get; private set; } = [];
    public IReadOnlyList<AuditEntry> AuditEntries { get; private set; } = [];
    public StatusPageInfo PageInfo { get; private set; } = new();
    public StatusCheck? EditingCheck { get; private set; }
    public string? AuthLabel { get; private set; }
    public string? Error { get; private set; }
    public bool EntraConfigured { get; private set; }

    public IActionResult OnGet(string? editCheck = null)
    {
        if (OperatorAuth.IsOperator(HttpContext))
        {
            Load(editCheck);
            return Page();
        }

        if (OperatorAuth.IsDeniedEntraUser(HttpContext))
        {
            return StatusCode(StatusCodes.Status403Forbidden);
        }

        return RedirectToLogin();
    }

    public async Task<IActionResult> OnPostLogoutAsync()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        if (OperatorAuth.IsAzureAdConfigured(configuration))
        {
            return SignOut(
                new AuthenticationProperties { RedirectUri = "/" },
                CookieAuthenticationDefaults.AuthenticationScheme,
                OpenIdConnectDefaults.AuthenticationScheme);
        }

        Response.Cookies.Delete(OperatorAuth.ApiKeyCookieName);
        return RedirectToPage("/OperatorLogin");
    }

    public IActionResult OnPostSavePage(string? name, string? logoUrl)
    {
        return Guarded(() =>
        {
            var page = store.UpdatePage(name, string.IsNullOrWhiteSpace(logoUrl) ? null : logoUrl);
            OperatorAuth.Audit(HttpContext, audit, "page.branding", page.Id);
            return RedirectToPage();
        });
    }

    public async Task<IActionResult> OnPostUploadLogoAsync(IFormFile? logo)
    {
        if (!OperatorAuth.IsOperator(HttpContext))
        {
            return OperatorAuth.IsDeniedEntraUser(HttpContext)
                ? StatusCode(StatusCodes.Status403Forbidden)
                : RedirectToLogin();
        }

        if (logo is null)
        {
            Error = "Choose a logo file.";
            Load(null);
            return Page();
        }

        try
        {
            var dir = configuration["StatusPage:BrandingPath"]
                      ?? Path.Combine(environment.ContentRootPath, "data", "branding");
            var url = BrandingFiles.Save(dir, logo);
            var page = store.UpdatePage(null, url);
            OperatorAuth.Audit(HttpContext, audit, "page.logo", page.Id);
            return RedirectToPage();
        }
        catch (ArgumentException ex)
        {
            Error = ex.Message;
            Load(null);
            return Page();
        }
    }

    public IActionResult OnPostSaveComponent(string? id, string? name, string? description, string? groupId, bool isGroup)
    {
        return Guarded(() =>
        {
            var request = new WriteComponentRequest(id, name ?? "", description, isGroup, groupId, null);
            if (store.FindComponent(id ?? "") is null)
            {
                var created = store.CreateComponent(request);
                OperatorAuth.Audit(HttpContext, audit, "component.create", created.Id);
            }
            else
            {
                store.UpdateComponentMeta(id!, request);
                OperatorAuth.Audit(HttpContext, audit, "component.edit", id!);
            }

            return RedirectToPage();
        });
    }

    public IActionResult OnPostDeleteComponent(string id)
    {
        return Guarded(() =>
        {
            store.DeleteComponent(id);
            OperatorAuth.Audit(HttpContext, audit, "component.delete", id);
            return RedirectToPage();
        });
    }

    public IActionResult OnPostSetStatus(string id, string status)
    {
        return Guarded(() =>
        {
            if (!DomainEnums.TryParseComponentStatus(status, out var parsed))
            {
                throw new ArgumentException("Invalid status.");
            }

            store.UpdateComponentStatus(id, parsed);
            OperatorAuth.Audit(HttpContext, audit, "component.status", id);
            return RedirectToPage();
        });
    }

    public IActionResult OnPostCreateIncident(
        string? name,
        string? status,
        string? impact,
        string? body,
        string? componentIds,
        bool maintenance,
        DateTimeOffset? scheduledFor,
        DateTimeOffset? scheduledUntil)
    {
        return Guarded(() =>
        {
            var ids = (componentIds ?? "")
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .ToList();
            var created = store.CreateIncident(new CreateIncidentRequest(
                name ?? "",
                status,
                impact,
                body ?? "",
                ids,
                scheduledFor,
                scheduledUntil), maintenance);
            OperatorAuth.Audit(HttpContext, audit, maintenance ? "maintenance.open" : "incident.open", created.Id);
            return RedirectToPage();
        });
    }

    public IActionResult OnPostUpdateIncident(string id, string? status, string? body)
    {
        return Guarded(() =>
        {
            var updated = store.UpdateIncident(id, new UpdateIncidentRequest(status, body ?? "", null, null));
            var action = updated.Status is IncidentStatus.Resolved or IncidentStatus.Completed
                ? "incident.resolve"
                : "incident.update";
            OperatorAuth.Audit(HttpContext, audit, action, updated.Id);
            return RedirectToPage();
        });
    }

    private IActionResult Guarded(Func<IActionResult> action)
    {
        if (OperatorAuth.IsDeniedEntraUser(HttpContext))
        {
            return StatusCode(StatusCodes.Status403Forbidden);
        }

        if (!OperatorAuth.IsOperator(HttpContext))
        {
            return RedirectToLogin();
        }

        try
        {
            return action();
        }
        catch (Exception ex) when (ex is ArgumentException or KeyNotFoundException)
        {
            Error = ex.Message;
            Load(null);
            return Page();
        }
    }

    private IActionResult RedirectToLogin()
    {
        if (OperatorAuth.IsAzureAdConfigured(configuration))
        {
            return Challenge(OpenIdConnectDefaults.AuthenticationScheme);
        }

        return RedirectToPage("/OperatorLogin");
    }

    private void Load(string? editCheck)
    {
        EntraConfigured = OperatorAuth.IsAzureAdConfigured(configuration);
        AuthLabel = User.Identity?.Name ?? "operator";
        var state = store.Snapshot();
        PublicApiMapper.MapCheckStatuses(state, store.ComponentCheckStatuses());
        Checks = store.ListChecks();
        Connectors = store.ListConnectorSnapshots();
        PageInfo = state.Page;
        Groups = state.Components.Where(c => c.Group).OrderBy(c => c.Position).ThenBy(c => c.Name).ToList();
        Components = state.Components
            .OrderBy(c => c.Group ? 0 : 1)
            .ThenBy(c => c.Position)
            .ThenBy(c => c.Name)
            .Select(c => new OperatorComponentRow(
                c,
                !c.Group && ComponentVisibility.IsInternalLeaf(c, Checks),
                Checks.Where(check => check.ComponentId == c.Id).ToList()))
            .ToList();
        Incidents = state.Incidents.Concat(state.ScheduledMaintenances)
            .OrderByDescending(i => i.UpdatedAt)
            .ToList();
        AuditEntries = audit.Recent(FileAuditLog.RecentDefault);
        if (!string.IsNullOrWhiteSpace(editCheck))
        {
            EditingCheck = Checks.FirstOrDefault(c => c.Id == editCheck);
        }
    }
}

public sealed record OperatorComponentRow(Component Component, bool Internal, IReadOnlyList<StatusCheck> Checks);
