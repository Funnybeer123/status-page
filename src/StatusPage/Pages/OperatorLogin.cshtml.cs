using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using StatusPage.Api;

namespace StatusPage.Pages;

public class OperatorLoginModel(IConfiguration configuration, IHostEnvironment environment) : PageModel
{
    [BindProperty]
    public string? ApiKey { get; set; }

    public string? Error { get; private set; }
    public bool EntraConfigured { get; private set; }
    public bool ApiKeyAvailable { get; private set; }

    public IActionResult OnGet()
    {
        EntraConfigured = OperatorAuth.IsAzureAdConfigured(configuration);
        ApiKeyAvailable = !string.IsNullOrWhiteSpace(OperatorAuth.ExpectedApiKey(configuration, environment));
        if (OperatorAuth.IsOperator(HttpContext))
        {
            return RedirectToPage("/Operator");
        }

        if (EntraConfigured && !ApiKeyAvailable)
        {
            return Challenge(OpenIdConnectDefaults.AuthenticationScheme);
        }

        return Page();
    }

    public async Task<IActionResult> OnPostAsync()
    {
        EntraConfigured = OperatorAuth.IsAzureAdConfigured(configuration);
        var expected = OperatorAuth.ExpectedApiKey(configuration, environment);
        ApiKeyAvailable = !string.IsNullOrWhiteSpace(expected);
        if (string.IsNullOrWhiteSpace(expected) || !string.Equals(ApiKey, expected, StringComparison.Ordinal))
        {
            Error = "Invalid API key.";
            return Page();
        }

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            OperatorAuth.ApiKeyPrincipal());
        return RedirectToPage("/Operator");
    }

    public IActionResult OnGetEntra()
    {
        if (!OperatorAuth.IsAzureAdConfigured(configuration))
        {
            return RedirectToPage();
        }

        return Challenge(OpenIdConnectDefaults.AuthenticationScheme);
    }
}
