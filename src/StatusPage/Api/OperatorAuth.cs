using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;

namespace StatusPage.Api;

public static class OperatorAuth
{
    public const string ApiKeyCookieName = "statuspage.api-key";
    public const string ApiKeyClaim = "statuspage.apikey";
    public const string DefaultOperatorRole = "StatusOperator";
    public const string ObjectIdClaim = "oid";
    public const string ObjectIdClaimLong = "http://schemas.microsoft.com/identity/claims/objectidentifier";

    public static bool IsAzureAdConfigured(IConfiguration config)
    {
        var tenant = config["AzureAd:TenantId"];
        var clientId = config["AzureAd:ClientId"];
        return !string.IsNullOrWhiteSpace(tenant) && !string.IsNullOrWhiteSpace(clientId);
    }

    public static string OperatorRoleName(IConfiguration config)
    {
        var role = config["AzureAd:OperatorRole"];
        return string.IsNullOrWhiteSpace(role) ? DefaultOperatorRole : role.Trim();
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

        return http.Request.Cookies.TryGetValue(ApiKeyCookieName, out var cookie)
               && string.Equals(cookie, expected, StringComparison.Ordinal);
    }

    public static bool IsOperator(HttpContext http)
    {
        var config = http.RequestServices.GetRequiredService<IConfiguration>();
        var env = http.RequestServices.GetRequiredService<IHostEnvironment>();
        return IsOperator(http.User, http, config, env);
    }

    public static bool IsOperator(ClaimsPrincipal user, HttpContext http, IConfiguration config, IHostEnvironment env)
    {
        if (HasValidApiKey(http, config, env) || user.HasClaim(ApiKeyClaim, "true"))
        {
            return true;
        }

        return IsAzureAdConfigured(config) && HasOperatorGrant(user, config);
    }

    /// <summary>
    /// Entra grant only: StatusOperator on roles/wids, or oid on AzureAd__AllowedObjectIds.
    /// Emails and UPNs never grant access.
    /// </summary>
    public static bool HasOperatorGrant(ClaimsPrincipal user, IConfiguration config)
    {
        if (user.Identity?.IsAuthenticated != true)
        {
            return false;
        }

        if (user.HasClaim(ApiKeyClaim, "true"))
        {
            return false;
        }

        var role = OperatorRoleName(config);
        if (RoleOrWidClaims(user).Any(value => string.Equals(value, role, StringComparison.OrdinalIgnoreCase)))
        {
            return true;
        }

        var allowed = AllowedObjectIds(config);
        if (allowed.Count == 0)
        {
            return false;
        }

        return ObjectIdClaims(user).Any(allowed.Contains);
    }

    public static bool IsDeniedEntraUser(HttpContext http)
    {
        var config = http.RequestServices.GetRequiredService<IConfiguration>();
        return IsAzureAdConfigured(config)
               && http.User.Identity?.IsAuthenticated == true
               && !http.User.HasClaim(ApiKeyClaim, "true")
               && !IsOperator(http);
    }

    public static IReadOnlySet<string> AllowedObjectIds(IConfiguration config)
    {
        var raw = config["AzureAd:AllowedObjectIds"] ?? config["AzureAd__AllowedObjectIds"];
        var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (string.IsNullOrWhiteSpace(raw))
        {
            return set;
        }

        foreach (var part in raw.Split([',', ';', '\n'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (Guid.TryParse(part, out var id))
            {
                set.Add(id.ToString("D"));
            }
        }

        return set;
    }

    public static IEnumerable<string> RoleOrWidClaims(ClaimsPrincipal user)
    {
        foreach (var claim in user.Claims)
        {
            if (IsRoleOrWidClaim(claim.Type) && !string.IsNullOrWhiteSpace(claim.Value))
            {
                yield return claim.Value.Trim();
            }
        }
    }

    public static IEnumerable<string> ObjectIdClaims(ClaimsPrincipal user)
    {
        foreach (var claim in user.Claims)
        {
            if (!IsObjectIdClaim(claim.Type) || !Guid.TryParse(claim.Value, out var id))
            {
                continue;
            }

            yield return id.ToString("D");
        }
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

        if (IsDeniedEntraUser(http))
        {
            return Results.Json(
                new { error = "Authenticated but not an operator. Requires the StatusOperator app role or an allowed object ID." },
                statusCode: StatusCodes.Status403Forbidden);
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

    private static bool IsRoleOrWidClaim(string type) =>
        type is "roles" or "role" or "wids"
        || type == ClaimTypes.Role
        || type.Equals("http://schemas.microsoft.com/ws/2008/06/identity/claims/role", StringComparison.OrdinalIgnoreCase);

    private static bool IsObjectIdClaim(string type) =>
        type is ObjectIdClaim or ObjectIdClaimLong;
}
