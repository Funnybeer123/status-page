using System.Globalization;

namespace StatusPage.Services;

/// <summary>
/// Operator IANA zone for public labels and v2 <c>page.time_zone</c> only.
/// Probes, mute windows, check-results.json, and 15-day uptime buckets stay UTC.
/// </summary>
public static class PageTimeZone
{
    public const string DefaultId = "Etc/UTC";

    public static bool TryResolve(string? raw, out string id)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            id = DefaultId;
            return false;
        }

        var trimmed = raw.Trim();
        if (TimeZoneInfo.TryFindSystemTimeZoneById(trimmed, out var tz))
        {
            id = tz.Id;
            return true;
        }

        id = DefaultId;
        return false;
    }

    public static string Require(string raw)
    {
        if (!TryResolve(raw, out var id))
        {
            throw new ArgumentException("Time zone must be a valid IANA zone.");
        }

        return id;
    }

    public static TimeZoneInfo Info(string? id) =>
        TimeZoneInfo.TryFindSystemTimeZoneById(string.IsNullOrWhiteSpace(id) ? DefaultId : id.Trim(), out var tz)
            ? tz
            : TimeZoneInfo.Utc;

    public static DateTimeOffset Convert(DateTimeOffset value, string? zoneId) =>
        TimeZoneInfo.ConvertTime(value, Info(zoneId));

    public static string Label(DateTimeOffset value, string? zoneId)
    {
        var tz = Info(zoneId);
        var local = TimeZoneInfo.ConvertTime(value, tz);
        return local.ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture) + " " + tz.Id;
    }

    public static string Rfc822(DateTimeOffset value, string? zoneId)
    {
        var local = Convert(value, zoneId);
        var offset = local.Offset;
        var sign = offset < TimeSpan.Zero ? "-" : "+";
        var abs = offset.Duration();
        return local.ToString("ddd, dd MMM yyyy HH:mm:ss ", CultureInfo.InvariantCulture)
               + $"{sign}{abs.Hours:00}{abs.Minutes:00}";
    }
}
