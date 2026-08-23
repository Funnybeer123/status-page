using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;

namespace StatusPage.Api;

public static class OperatorAuth
{
    public const string ApiKeyCookieName = "statuspage.api-key";
    public const string ApiKeyClaim = "statuspage.apikey";

    public static bool IsAzureAdConfigured(IConfiguration config)
    {
        var tenant = config["AzureAd:TenantId"];
        var clientId = config["AzureAd:ClientId"];
        return !string.IsNullOrWhiteSpace(tenant) && !string.IsNullOrWhiteSpace(clientId);
    }

    public static string? ExpectedApiKey(IConfiguration config, IHostEnvironment env)
    {
        var expected = config["STATUSPAGE_API_KEY"] ?? config["StatusPage:ApiKey"];
        if (!string.IsNullOrWhiteSpace(expected))
        {
            return expected;
        }

        return env.IsDevelopment() ? "dev-key" : null;
    }

    public static bool HasValidApiKey(HttpContext http, IConfiguration config, IHostEnvironment env)
    {
        var expected = ExpectedApiKey(config, env);
        if (string.IsNullOrWhiteSpace(expected))
        {
            return false;
        }

        var header = http.Request.Headers["X-Api-Key"].ToString();
        if (string.Equals(header, expected, StringComparison.Ordinal))
        {
            return true;
        }

        if (http.Request.Cookies.TryGetValue(ApiKeyCookieName, out var cookie)
            && string.Equals(cookie, expected, StringComparison.Ordinal))
        {
            return true;
        }

        return false;
    }

    public static bool IsOperator(HttpContext http)
    {
        if (http.User.Identity?.IsAuthenticated == true)
        {
            return true;
        }

        var config = http.RequestServices.GetRequiredService<IConfiguration>();
        var env = http.RequestServices.GetRequiredService<IHostEnvironment>();
        return HasValidApiKey(http, config, env);
    }

    public static ClaimsPrincipal ApiKeyPrincipal()
    {
        var identity = new ClaimsIdentity(
            [new Claim(ClaimTypes.Name, "api-key"), new Claim(ApiKeyClaim, "true")],
            CookieAuthenticationDefaults.AuthenticationScheme);
        return new ClaimsPrincipal(identity);
    }

    public static void AttachApiKeyIdentity(HttpContext http)
    {
        if (http.User.Identity?.IsAuthenticated == true)
        {
            return;
        }

        var config = http.RequestServices.GetRequiredService<IConfiguration>();
        var env = http.RequestServices.GetRequiredService<IHostEnvironment>();
        if (HasValidApiKey(http, config, env))
        {
            http.User = ApiKeyPrincipal();
        }
    }

    public static async ValueTask<object?> RequireOperator(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var http = context.HttpContext;
        AttachApiKeyIdentity(http);
        if (IsOperator(http))
        {
            return await next(context);
        }

        var env = http.RequestServices.GetRequiredService<IHostEnvironment>();
        var config = http.RequestServices.GetRequiredService<IConfiguration>();
        if (!IsAzureAdConfigured(config) && string.IsNullOrWhiteSpace(ExpectedApiKey(config, env)))
        {
            return Results.Json(new { error = "Operator API is disabled. Set STATUSPAGE_API_KEY or configure AzureAd." }, statusCode: 401);
        }

        return Results.Json(new { error = "Invalid or missing operator credentials. Sign in with Entra or send X-Api-Key." }, statusCode: 401);
    }

    public static string ChallengeScheme(IConfiguration config) =>
        IsAzureAdConfigured(config)
            ? OpenIdConnectDefaults.AuthenticationScheme
            : CookieAuthenticationDefaults.AuthenticationScheme;
}
