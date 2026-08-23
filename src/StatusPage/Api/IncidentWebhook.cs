using System.Security.Cryptography;
using System.Text;
using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Api;

/// <summary>
/// Inbound public-incident webhook. Receive-only: never fetches a caller URL.
/// Enabled only when a process env secret is set. The secret is never stored in git.
/// </summary>
public static class IncidentWebhook
{
    public const string Path = "/api/hooks/incidents";
    public const string HeaderName = "X-Incident-Webhook-Secret";
    public const string Actor = "webhook";
    public const string SecretConfigKey = "StatusPage:IncidentWebhookSecret";
    public const string SecretEnvKey = "STATUSPAGE_INCIDENT_WEBHOOK_SECRET";
    public const string EnabledConfigKey = "StatusPage:EnableIncidentWebhook";

    public static string? ExpectedSecret(IConfiguration config)
    {
        var secret = config[SecretEnvKey] ?? config[SecretConfigKey];
        return string.IsNullOrWhiteSpace(secret) ? null : secret;
    }

    /// <summary>
    /// Disabled when the operator flag is false or the env secret is unset.
    /// The path must 404 in that case (not 401).
    /// </summary>
    public static bool IsEnabled(IConfiguration config)
    {
        if (config.GetValue<bool?>(EnabledConfigKey) == false)
        {
            return false;
        }

        return ExpectedSecret(config) is not null;
    }

    /// <summary>
    /// Constant-time compare via SHA-256 then <see cref="CryptographicOperations.FixedTimeEquals"/>.
    /// Length of the provided header does not change the compare.
    /// </summary>
    public static bool SecretsEqual(string? provided, string expected)
    {
        var left = SHA256.HashData(Encoding.UTF8.GetBytes(provided ?? ""));
        var right = SHA256.HashData(Encoding.UTF8.GetBytes(expected));
        return CryptographicOperations.FixedTimeEquals(left, right);
    }

    public static async ValueTask<object?> Guard(
        EndpointFilterInvocationContext context,
        EndpointFilterDelegate next)
    {
        var http = context.HttpContext;
        var config = http.RequestServices.GetRequiredService<IConfiguration>();
        if (!IsEnabled(config))
        {
            return Results.NotFound();
        }

        var expected = ExpectedSecret(config)!;
        var provided = http.Request.Headers[HeaderName].ToString();
        if (!SecretsEqual(provided, expected))
        {
            return Results.Json(
                new { error = "Invalid or missing incident webhook secret." },
                statusCode: StatusCodes.Status401Unauthorized);
        }

        return await next(context);
    }

    public static IReadOnlyList<string> RequirePublicComponentIds(
        IEnumerable<string>? ids,
        IStatusStore store)
    {
        var checks = store.ListChecks();
        var result = new List<string>();
        foreach (var raw in ids ?? [])
        {
            var id = raw.Trim();
            if (id.Length == 0)
            {
                continue;
            }

            var component = store.FindComponent(id)
                            ?? throw new ArgumentException($"Unknown component '{id}'.");
            if (component.Group)
            {
                throw new ArgumentException($"Webhook cannot include group id '{id}'.");
            }

            if (ComponentVisibility.IsInternalLeaf(component, checks))
            {
                throw new ArgumentException($"Webhook cannot include internal component '{id}'.");
            }

            if (!result.Contains(id, StringComparer.Ordinal))
            {
                result.Add(id);
            }
        }

        return result;
    }

    public static void RequirePublicIncident(Incident incident, IStatusStore store)
    {
        var state = store.Snapshot();
        if (state.ScheduledMaintenances.Any(i => i.Id == incident.Id)
            || PostmortemRules.IsInternalOnly(incident, state, store.ListChecks()))
        {
            throw new ArgumentException("Webhook can only open or update a public incident.");
        }
    }

    public static string AuditAction(Incident incident, bool created) =>
        created
            ? "incident.open"
            : incident.Status is IncidentStatus.Resolved or IncidentStatus.Completed
                ? "incident.resolve"
                : "incident.update";
}
