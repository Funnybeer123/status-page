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

public class OperatorModel(IStatusStore store, IConfiguration configuration) : PageModel
{
    public IReadOnlyList<OperatorComponentRow> Components { get; private set; } = [];
    public IReadOnlyList<StatusCheck> Checks { get; private set; } = [];
    public IReadOnlyList<ConnectorSnapshot> Connectors { get; private set; } = [];
    public string? AuthLabel { get; private set; }
    public string? Error { get; private set; }
    public bool EntraConfigured { get; private set; }

    public IActionResult OnGet()
    {
        if (OperatorAuth.IsOperator(HttpContext))
        {
            Load();
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

    public IActionResult OnPostCreateCheck(
        string? name,
        string? componentId,
        string? componentName,
        string? groupId,
        string? type,
        string? target,
        string? expectedStatus,
        string? bodyContains,
        string? jsonPath,
        string? expectedJsonValue,
        int? tlsDays,
        string? headerName,
        string? headerValue)
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
            var (targetSpec, inferredType) = ParseTarget(target, type);
            var statuses = ParseStatuses(expectedStatus);
            var headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            if (!string.IsNullOrWhiteSpace(headerName) && headerValue is not null)
            {
                headers[headerName.Trim()] = headerValue;
            }

            store.CreateCheck(new CreateCheckRequest(
                string.IsNullOrWhiteSpace(name) ? (componentName ?? "probe") : name.Trim(),
                componentId ?? "",
                inferredType,
                true,
                CheckContract.DefaultIntervalSeconds,
                CheckContract.DefaultTimeoutSeconds,
                CheckContract.DefaultFailureThreshold,
                CheckContract.DefaultSuccessThreshold,
                targetSpec,
                new HttpCheckSpec
                {
                    Method = "GET",
                    ExpectedStatus = statuses,
                    BodyContains = string.IsNullOrWhiteSpace(bodyContains) ? null : bodyContains,
                    JsonPath = string.IsNullOrWhiteSpace(jsonPath) ? null : jsonPath.Trim(),
                    ExpectedJsonValue = string.IsNullOrWhiteSpace(expectedJsonValue) ? null : expectedJsonValue,
                    Headers = headers
                },
                componentName,
                groupId,
                tlsDays is null ? null : new TlsCheckSpec { Days = tlsDays.Value }));
            return RedirectToPage();
        }
        catch (ArgumentException ex)
        {
            Error = ex.Message;
            Load();
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

    private void Load()
    {
        EntraConfigured = OperatorAuth.IsAzureAdConfigured(configuration);
        AuthLabel = User.Identity?.Name ?? "operator";
        var state = store.Snapshot();
        PublicApiMapper.MapCheckStatuses(state, store.ComponentCheckStatuses());
        Checks = store.ListChecks();
        Connectors = store.ListConnectorSnapshots();
        Components = state.Components
            .Where(c => !c.Group)
            .OrderBy(c => c.Position)
            .ThenBy(c => c.Name)
            .Select(c => new OperatorComponentRow(
                c,
                ComponentVisibility.IsInternalLeaf(c, Checks),
                Checks.Where(check => check.ComponentId == c.Id).ToList()))
            .ToList();
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
