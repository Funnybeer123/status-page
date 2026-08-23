using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using StatusPage.Api;
using StatusPage.Contracts;
using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Pages;

public class OperatorModel(IStatusStore store, IConfiguration configuration, IHostEnvironment environment) : PageModel
{
    public IReadOnlyList<Component> Groups { get; private set; } = [];
    public IReadOnlyList<OperatorComponentRow> Components { get; private set; } = [];
    public IReadOnlyList<StatusCheck> Checks { get; private set; } = [];
    public IReadOnlyList<Incident> Incidents { get; private set; } = [];
    public IReadOnlyList<ConnectorSnapshot> Connectors { get; private set; } = [];
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
            store.UpdatePage(name, string.IsNullOrWhiteSpace(logoUrl) ? null : logoUrl);
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
            store.UpdatePage(null, url);
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
                store.CreateComponent(request);
            }
            else
            {
                store.UpdateComponentMeta(id!, request);
            }

            return RedirectToPage();
        });
    }

    public IActionResult OnPostDeleteComponent(string id)
    {
        return Guarded(() =>
        {
            store.DeleteComponent(id);
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
            return RedirectToPage();
        });
    }

    public IActionResult OnPostCreateCheck(
        string? name,
        string? componentId,
        string? componentName,
        string? groupId,
        string? type,
        string? target,
        int? intervalSeconds,
        int? timeoutSeconds,
        string? expectedStatus,
        string? bodyContains,
        string? jsonPath,
        string? expectedJsonValue,
        int? tlsDays,
        string? dnsExpected,
        string? headerName,
        string? headerValue)
    {
        return Guarded(() =>
        {
            store.CreateCheck(ToCheckRequest(
                name, componentId, componentName, groupId, type, target, intervalSeconds, timeoutSeconds,
                expectedStatus, bodyContains, jsonPath, expectedJsonValue, tlsDays, dnsExpected, headerName, headerValue, true));
            return RedirectToPage();
        });
    }

    public IActionResult OnPostUpdateCheck(
        string id,
        string? name,
        string? componentId,
        string? componentName,
        string? groupId,
        string? type,
        string? target,
        int? intervalSeconds,
        int? timeoutSeconds,
        string? expectedStatus,
        string? bodyContains,
        string? jsonPath,
        string? expectedJsonValue,
        int? tlsDays,
        string? dnsExpected,
        string? headerName,
        string? headerValue,
        bool enabled)
    {
        return Guarded(() =>
        {
            store.UpdateCheck(id, ToCheckRequest(
                name, componentId, componentName, groupId, type, target, intervalSeconds, timeoutSeconds,
                expectedStatus, bodyContains, jsonPath, expectedJsonValue, tlsDays, dnsExpected, headerName, headerValue, enabled));
            return RedirectToPage();
        });
    }

    public IActionResult OnPostSetCheckEnabled(string id, bool enabled)
    {
        return Guarded(() =>
        {
            store.SetCheckEnabled(id, enabled);
            return RedirectToPage();
        });
    }

    public IActionResult OnPostDeleteCheck(string id)
    {
        return Guarded(() =>
        {
            store.DeleteCheck(id);
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
            store.CreateIncident(new CreateIncidentRequest(
                name ?? "",
                status,
                impact,
                body ?? "",
                ids,
                scheduledFor,
                scheduledUntil), maintenance);
            return RedirectToPage();
        });
    }

    public IActionResult OnPostUpdateIncident(string id, string? status, string? body)
    {
        return Guarded(() =>
        {
            store.UpdateIncident(id, new UpdateIncidentRequest(status, body ?? "", null, null));
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
        if (!string.IsNullOrWhiteSpace(editCheck))
        {
            EditingCheck = Checks.FirstOrDefault(c => c.Id == editCheck);
        }
    }

    private static CreateCheckRequest ToCheckRequest(
        string? name,
        string? componentId,
        string? componentName,
        string? groupId,
        string? type,
        string? target,
        int? intervalSeconds,
        int? timeoutSeconds,
        string? expectedStatus,
        string? bodyContains,
        string? jsonPath,
        string? expectedJsonValue,
        int? tlsDays,
        string? dnsExpected,
        string? headerName,
        string? headerValue,
        bool? enabled)
    {
        var (targetSpec, inferredType) = ParseTarget(target, type);
        var headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        if (!string.IsNullOrWhiteSpace(headerName) && headerValue is not null)
        {
            headers[headerName.Trim()] = headerValue;
        }

        var dns = (dnsExpected ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToList();

        return new CreateCheckRequest(
            string.IsNullOrWhiteSpace(name) ? (componentName ?? "probe") : name.Trim(),
            componentId ?? "",
            inferredType,
            enabled,
            intervalSeconds ?? CheckContract.DefaultIntervalSeconds,
            timeoutSeconds ?? CheckContract.DefaultTimeoutSeconds,
            CheckContract.DefaultFailureThreshold,
            CheckContract.DefaultSuccessThreshold,
            targetSpec,
            new HttpCheckSpec
            {
                Method = "GET",
                ExpectedStatus = ParseStatuses(expectedStatus),
                BodyContains = string.IsNullOrWhiteSpace(bodyContains) ? null : bodyContains,
                JsonPath = string.IsNullOrWhiteSpace(jsonPath) ? null : jsonPath.Trim(),
                ExpectedJsonValue = string.IsNullOrWhiteSpace(expectedJsonValue) ? null : expectedJsonValue,
                Headers = headers
            },
            componentName,
            groupId,
            tlsDays is null ? null : new TlsCheckSpec { Days = tlsDays.Value },
            dns.Count == 0 ? null : new DnsCheckSpec { ExpectedAddresses = dns });
    }

    private static (CheckTargetSpec Target, string? Type) ParseTarget(string? raw, string? type)
    {
        var value = raw?.Trim() ?? "";
        if (value.Contains("://", StringComparison.Ordinal))
        {
            return (new CheckTargetSpec { Url = value }, string.IsNullOrWhiteSpace(type) ? null : type);
        }

        if (CheckTarget.TryParseHostPort(value, out var host, out var port))
        {
            return (new CheckTargetSpec { Host = host, Port = port }, string.IsNullOrWhiteSpace(type) ? "tcp" : type);
        }

        return (new CheckTargetSpec { Host = value, Url = value }, type);
    }

    private static List<int> ParseStatuses(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return [.. CheckContract.DefaultExpectedStatus];
        }

        return raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(part => int.TryParse(part, out var code) ? code : 0)
            .Where(code => code is >= 100 and <= 599)
            .ToList();
    }
}

public sealed record OperatorComponentRow(Component Component, bool Internal, IReadOnlyList<StatusCheck> Checks);
