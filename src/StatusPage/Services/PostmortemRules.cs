using System.Text.RegularExpressions;
using StatusPage.Domain;

namespace StatusPage.Services;

/// <summary>
/// Postmortems are markdown, unpublished by default, and never make an
/// internal-only incident public. Published bodies cannot include check
/// targets, host:port, or result error strings.
/// </summary>
public static class PostmortemRules
{
    public const int MaxBodyLength = 20_000;

    private static readonly Regex HostPort = new(
        @"(?:(?:\d{1,3}\.){3}\d{1,3}|[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+|[A-Za-z][A-Za-z0-9-]*)\:(?:[1-9]\d{0,3}|[1-5]\d{4}|6[0-4]\d{3}|65[0-4]\d{2}|655[0-2]\d|6553[0-5])\b",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    public static bool AllowsWrite(Incident incident) =>
        incident.ResolvedAt is not null
        || incident.Status is IncidentStatus.Resolved or IncidentStatus.Completed or IncidentStatus.Postmortem;

    public static string NormalizeBody(string? body)
    {
        var value = (body ?? "").Replace("\r\n", "\n", StringComparison.Ordinal).Trim();
        if (value.Length == 0)
        {
            throw new ArgumentException("Postmortem markdown body is required.");
        }

        if (value.Length > MaxBodyLength)
        {
            throw new ArgumentException($"Postmortem body must be at most {MaxBodyLength} characters.");
        }

        return value;
    }

    public static void EnsureSafeToPublish(string body, IEnumerable<StatusCheck> checks)
    {
        if (FindLeak(body, checks) is { } leak)
        {
            throw new ArgumentException(
                $"Published postmortem must not include check targets, host:port, or result error strings ({leak}).");
        }
    }

    public static string? FindLeak(string body, IEnumerable<StatusCheck> checks)
    {
        foreach (var needle in LeakNeedles(checks))
        {
            if (ContainsOrdinalIgnoreCase(body, needle.Value))
            {
                return needle.Kind;
            }
        }

        return HostPort.IsMatch(body) ? "host:port" : null;
    }

    /// <summary>Defense in depth for anonymous/public snapshots.</summary>
    public static string PublicBody(string body, IEnumerable<StatusCheck> checks)
    {
        var text = body;
        foreach (var needle in LeakNeedles(checks).OrderByDescending(n => n.Value.Length))
        {
            text = ReplaceOrdinalIgnoreCase(text, needle.Value, "");
        }

        return HostPort.Replace(text, "").Trim();
    }

    public static void PreparePublic(StatusPageState state, IEnumerable<StatusCheck> checks)
    {
        var checkList = checks.ToList();
        foreach (var incident in state.Incidents.Concat(state.ScheduledMaintenances))
        {
            if (incident.Postmortem is not { Published: true } published)
            {
                incident.Postmortem = null;
                continue;
            }

            published.Body = PublicBody(published.Body, checkList);
        }
    }

    public static bool IsInternalOnly(Incident incident, StatusPageState state, IEnumerable<StatusCheck> checks)
    {
        if (incident.ComponentIds.Count == 0)
        {
            return false;
        }

        var checkList = checks.ToList();
        return incident.ComponentIds.All(id =>
        {
            var component = state.Components.FirstOrDefault(c => c.Id == id);
            return component is not null && ComponentVisibility.IsInternalLeaf(component, checkList);
        });
    }

    private static IEnumerable<(string Kind, string Value)> LeakNeedles(IEnumerable<StatusCheck> checks)
    {
        foreach (var check in checks)
        {
            if (!string.IsNullOrWhiteSpace(check.DisplayTarget))
            {
                yield return ("check target", check.DisplayTarget);
            }

            if (!string.IsNullOrWhiteSpace(check.Target.Url))
            {
                yield return ("check target", check.Target.Url!);
            }

            if (!string.IsNullOrWhiteSpace(check.Target.Host) && check.Target.Port is > 0)
            {
                yield return ("host:port", $"{check.Target.Host}:{check.Target.Port}");
            }

            foreach (var result in check.Results)
            {
                if (!string.IsNullOrWhiteSpace(result.Error))
                {
                    yield return ("result error", result.Error!);
                }
            }
        }
    }

    private static bool ContainsOrdinalIgnoreCase(string haystack, string needle) =>
        !string.IsNullOrWhiteSpace(needle)
        && haystack.Contains(needle, StringComparison.OrdinalIgnoreCase);

    private static string ReplaceOrdinalIgnoreCase(string text, string needle, string replacement)
    {
        if (string.IsNullOrWhiteSpace(needle))
        {
            return text;
        }

        var index = text.IndexOf(needle, StringComparison.OrdinalIgnoreCase);
        if (index < 0)
        {
            return text;
        }

        return string.Concat(text.AsSpan(0, index), replacement, text.AsSpan(index + needle.Length));
    }
}
