using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using StatusPage.Api;
using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Pages;

public class OperatorModel(IStatusStore store, IConfiguration configuration, IHostEnvironment environment, IAuditLog audit, IWebhookStore webhooks, IIncidentTemplateStore templates) : PageModel
{
    public IReadOnlyList<Component> Groups { get; private set; } = [];
    public IReadOnlyList<OperatorComponentRow> Components { get; private set; } = [];
    public IReadOnlyList<StatusCheck> Checks { get; private set; } = [];
    public IReadOnlyList<Incident> Incidents { get; private set; } = [];
    public IReadOnlyList<ConnectorSnapshot> Connectors { get; private set; } = [];
    public IReadOnlyList<AuditEntry> AuditEntries { get; private set; } = [];
    public IReadOnlyList<WebhookRecord> Webhooks { get; private set; } = [];
    public IReadOnlyList<IncidentTemplate> Templates { get; private set; } = [];
    public StatusPageInfo PageInfo { get; private set; } = new();
    public StatusCheck? EditingCheck { get; private set; }
    public string? AuthLabel { get; private set; }
    public string? Error { get; private set; }
    public bool EntraConfigured { get; private set; }
    public bool CanWrite { get; private set; }
    public string PrefillName { get; private set; } = "";
    public string PrefillImpact { get; private set; } = "";
    public string PrefillComponentIds { get; private set; } = "";
    public StatusCheck? NextMute { get; private set; }

    public IActionResult OnGet(string? editCheck = null, string? applyTemplate = null)
    {
        if (OperatorAuth.IsStaff(HttpContext))
        {
            Load(editCheck, applyTemplate);
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

    public IActionResult OnPostSavePage(string? name, string? logoUrl, string? timeZone)
    {
        return Guarded(() =>
        {
            var page = store.UpdatePage(name, string.IsNullOrWhiteSpace(logoUrl) ? null : logoUrl, timeZone);
            OperatorAuth.Audit(HttpContext, audit, "page.branding", page.Id);
            return RedirectToPage();
        });
    }

    public async Task<IActionResult> OnPostUploadLogoAsync(IFormFile? logo)
    {
        if (!OperatorAuth.IsOperator(HttpContext))
        {
            return OperatorAuth.IsViewer(HttpContext) || OperatorAuth.IsDeniedEntraUser(HttpContext)
                ? StatusCode(StatusCodes.Status403Forbidden)
                : RedirectToLogin();
        }

        if (logo is null)
        {
            Error = "Choose a logo file.";
            Load();
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
            Load();
            return Page();
        }
    }

    public IActionResult OnPostSaveComponent(string? id, string? name, string? description, string? groupId, string? parentId, bool isGroup)
    {
        return Guarded(() =>
        {
            var request = new WriteComponentRequest(id, name ?? "", description, isGroup, groupId, null, parentId);
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

    public IActionResult OnPostSavePostmortem(string id, string? body, bool published)
    {
        return Guarded(() =>
        {
            var updated = store.SavePostmortem(id, new WritePostmortemRequest(body ?? "", published));
            var action = updated.Postmortem?.Published == true
                ? "incident.postmortem.publish"
                : "incident.postmortem.save";
            OperatorAuth.Audit(HttpContext, audit, action, updated.Id);
            return RedirectToPage();
        });
    }

    public IActionResult OnPostAddWebhook(string? url)
    {
        return Guarded(() =>
        {
            var created = webhooks.Add(url ?? "");
            OperatorAuth.Audit(HttpContext, audit, "webhook.create", created.Id);
            return RedirectToPage();
        });
    }

    public IActionResult OnPostDeleteWebhook(string id)
    {
        return Guarded(() =>
        {
            webhooks.Delete(id);
            OperatorAuth.Audit(HttpContext, audit, "webhook.delete", id);
            return RedirectToPage();
        });
    }

    private IActionResult Guarded(Func<IActionResult> action)
    {
        if (OperatorAuth.IsViewer(HttpContext) || OperatorAuth.IsDeniedEntraUser(HttpContext))
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
            Load();
            return Page();
        }
    }

    public IActionResult OnPostSaveTemplate(string? id, string? title, string? impact, string? componentIds)
    {
        return Guarded(() =>
        {
            var ids = IncidentTemplateRules.NormalizePublicComponentIds(
                (componentIds ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries),
                store);
            var normalizedTitle = IncidentTemplateRules.NormalizeTitle(title);
            var normalizedImpact = IncidentTemplateRules.NormalizeImpact(impact);
            if (string.IsNullOrWhiteSpace(id) || templates.Find(id) is null)
            {
                var created = templates.Create(normalizedTitle, normalizedImpact, ids);
                OperatorAuth.Audit(HttpContext, audit, "template.create", created.Id);
            }
            else
            {
                templates.Update(id, normalizedTitle, normalizedImpact, ids);
                OperatorAuth.Audit(HttpContext, audit, "template.edit", id);
            }

            return RedirectToPage();
        });
    }

    public IActionResult OnPostDeleteTemplate(string id)
    {
        return Guarded(() =>
        {
            templates.Delete(id);
            OperatorAuth.Audit(HttpContext, audit, "template.delete", id);
            return RedirectToPage();
        });
    }

    private IActionResult RedirectToLogin()
    {
        if (OperatorAuth.IsAzureAdConfigured(configuration))
        {
            return Challenge(OpenIdConnectDefaults.AuthenticationScheme);
        }

        return RedirectToPage("/OperatorLogin");
    }

    private void Load(string? editCheck = null, string? applyTemplate = null)
    {
        EntraConfigured = OperatorAuth.IsAzureAdConfigured(configuration);
        CanWrite = OperatorAuth.IsOperator(HttpContext);
        AuthLabel = User.Identity?.Name ?? "operator";
        var state = store.Snapshot();
        PublicApiMapper.MapCheckStatuses(state, store.ComponentCheckStatuses());
        var allChecks = store.ListChecks();
        if (!CanWrite)
        {
            ComponentVisibility.RemoveInternal(state, allChecks);
            Checks = allChecks.Where(check => !InternalHost.IsInternalCheck(check)).ToList();
        }
        else
        {
            Checks = allChecks;
        }

        NextMute = CheckMute.NextWindow(Checks, DateTimeOffset.UtcNow);
        Connectors = store.ListConnectorSnapshots();
        PageInfo = state.Page;
        Groups = state.Components.Where(c => c.Group).OrderBy(c => c.Position).ThenBy(c => c.Name).ToList();
        Components = state.Components
            .OrderBy(c => c.Group ? 0 : 1)
            .ThenBy(c => c.Position)
            .ThenBy(c => c.Name)
            .Select(c => new OperatorComponentRow(
                c,
                !c.Group && ComponentVisibility.IsInternalLeaf(c, allChecks),
                Checks.Where(check => check.ComponentId == c.Id).ToList()))
            .ToList();
        Incidents = state.Incidents.Concat(state.ScheduledMaintenances)
            .OrderByDescending(i => i.UpdatedAt)
            .ToList();
        AuditEntries = audit.Recent(FileAuditLog.RecentDefault);
        Webhooks = webhooks.List();
        Templates = templates.List();
        if (CanWrite && !string.IsNullOrWhiteSpace(applyTemplate))
        {
            var template = templates.Find(applyTemplate);
            if (template is not null)
            {
                PrefillName = template.Title;
                PrefillImpact = template.Impact;
                PrefillComponentIds = string.Join(",", template.ComponentIds);
            }
        }

        if (CanWrite && !string.IsNullOrWhiteSpace(editCheck))
        {
            EditingCheck = Checks.FirstOrDefault(c => c.Id == editCheck);
        }
    }

    public static string IsoUtc(DateTimeOffset? value) =>
        value is null ? "" : value.Value.ToUniversalTime().ToString("yyyy-MM-dd'T'HH:mm:ss'Z'");

    public static string UtcWindow(DateTimeOffset? from, DateTimeOffset? until)
    {
        if (from is null && until is null)
        {
            return "—";
        }

        return $"{IsoUtc(from)} – {IsoUtc(until)} UTC";
    }
}

public sealed record OperatorComponentRow(Component Component, bool Internal, IReadOnlyList<StatusCheck> Checks);
