using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using StatusPage.Services;

namespace StatusPage.Api;

public static class OperatorAuth
{
    public const string ApiKeyCookieName = "statuspage.api-key";
    public const string ApiKeyClaim = "statuspage.apikey";
    public const string DefaultOperatorRole = "StatusOperator";
    public const string DefaultViewerRole = "StatusViewer";
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

    public static string ViewerRoleName(IConfiguration config)
    {
        var role = config["AzureAd:ViewerRole"];
        return string.IsNullOrWhiteSpace(role) ? DefaultViewerRole : role.Trim();
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

    /// <summary>
    /// Entra StatusViewer on roles/wids only. AllowedObjectIds stay write operators.
    /// </summary>
    public static bool HasViewerRole(ClaimsPrincipal user, IConfiguration config)
    {
        if (user.Identity?.IsAuthenticated != true || user.HasClaim(ApiKeyClaim, "true"))
        {
            return false;
        }

        var role = ViewerRoleName(config);
        return RoleOrWidClaims(user).Any(value => string.Equals(value, role, StringComparison.OrdinalIgnoreCase));
    }

    public static bool IsViewer(HttpContext http)
    {
        if (IsOperator(http))
        {
            return false;
        }

        var config = http.RequestServices.GetRequiredService<IConfiguration>();
        return IsAzureAdConfigured(config) && HasViewerRole(http.User, config);
    }

    public static bool IsStaff(HttpContext http)
    {
        if (IsOperator(http))
        {
            return true;
        }

        var config = http.RequestServices.GetRequiredService<IConfiguration>();
        return IsAzureAdConfigured(config) && HasViewerRole(http.User, config);
    }

    public static bool IsDeniedEntraUser(HttpContext http)
    {
        var config = http.RequestServices.GetRequiredService<IConfiguration>();
        return IsAzureAdConfigured(config)
               && http.User.Identity?.IsAuthenticated == true
               && !http.User.HasClaim(ApiKeyClaim, "true")
               && !IsStaff(http);
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

    public static void Audit(HttpContext http, IAuditLog audit, string action, string targetId) =>
        audit.Append(Actor(http), action, targetId);

    /// <summary>api-key or Entra object ID. Never an email or UPN.</summary>
    public static string Actor(HttpContext http)
    {
        var config = http.RequestServices.GetRequiredService<IConfiguration>();
        var env = http.RequestServices.GetRequiredService<IHostEnvironment>();
        if (HasValidApiKey(http, config, env) || http.User.HasClaim(ApiKeyClaim, "true"))
        {
            return "api-key";
        }

        var oid = ObjectIdClaims(http.User).FirstOrDefault();
        return string.IsNullOrWhiteSpace(oid) ? "operator" : oid;
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

        if (IsViewer(http) || IsDeniedEntraUser(http))
        {
            return Results.Json(
                new { error = "Authenticated but not an operator. Requires the StatusOperator app role or an allowed object ID." },
                statusCode: StatusCodes.Status403Forbidden);
        }

        return Unauthorized(http);
    }

    /// <summary>
    /// GET/HEAD: StatusOperator, StatusViewer, API key, or AllowedObjectIds.
    /// Writes: StatusOperator, AllowedObjectIds, or API key only.
    /// Anonymous is always 401. Export is never public.
    /// </summary>
    public static async ValueTask<object?> RequireStaffReadOrOperatorWrite(
        EndpointFilterInvocationContext context,
        EndpointFilterDelegate next)
    {
        var http = context.HttpContext;
        AttachApiKeyIdentity(http);
        var read = HttpMethods.IsGet(http.Request.Method) || HttpMethods.IsHead(http.Request.Method);
        if (read)
        {
            if (IsStaff(http))
            {
                return await next(context);
            }

            if (IsDeniedEntraUser(http))
            {
                return Results.Json(
                    new { error = "Authenticated but not a StatusOperator or StatusViewer." },
                    statusCode: StatusCodes.Status403Forbidden);
            }

            return Unauthorized(http);
        }

        return await RequireOperator(context, next);
    }

    private static IResult Unauthorized(HttpContext http)
    {
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
