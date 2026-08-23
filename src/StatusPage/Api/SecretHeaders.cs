namespace StatusPage.Api;

/// <summary>
/// Authorization and other secret header values never leave the process
/// in exports or operator HTML. Runtime data/checks.json may still store them.
/// </summary>
public static class SecretHeaders
{
    public const string RedactedValue = "(set)";

    public static bool IsSensitive(string name) =>
        name.Equals("Authorization", StringComparison.OrdinalIgnoreCase)
        || name.Equals("Proxy-Authorization", StringComparison.OrdinalIgnoreCase)
        || name.Contains("secret", StringComparison.OrdinalIgnoreCase)
        || name.Contains("token", StringComparison.OrdinalIgnoreCase)
        || name.Contains("key", StringComparison.OrdinalIgnoreCase);

    public static bool IsRedacted(string? value) =>
        string.IsNullOrWhiteSpace(value)
        || string.Equals(value, RedactedValue, StringComparison.OrdinalIgnoreCase);

    public static Dictionary<string, string>? RedactValues(IReadOnlyDictionary<string, string>? headers)
    {
        if (headers is null || headers.Count == 0)
        {
            return null;
        }

        return headers.ToDictionary(
            kv => kv.Key,
            kv => IsSensitive(kv.Key) ? RedactedValue : kv.Value,
            StringComparer.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Import must not persist a redacted placeholder as the real header.
    /// Existing secret values stay when the incoming value is missing or "(set)".
    /// </summary>
    public static Dictionary<string, string> MergeImport(
        IReadOnlyDictionary<string, string>? incoming,
        IReadOnlyDictionary<string, string>? existing)
    {
        var merged = existing is { Count: > 0 }
            ? new Dictionary<string, string>(existing, StringComparer.OrdinalIgnoreCase)
            : new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        if (incoming is null)
        {
            return merged;
        }

        foreach (var (name, value) in incoming)
        {
            if (IsSensitive(name) && IsRedacted(value))
            {
                continue;
            }

            if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(value))
            {
                continue;
            }

            merged[name] = value;
        }

        return merged;
    }
}
