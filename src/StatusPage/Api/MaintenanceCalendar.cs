using System.Text;
using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Api;

/// <summary>
/// Public ICS of scheduled maintenance only. Callers must pass a ForPublic snapshot
/// so internal-only items are omitted.
/// </summary>
public static class MaintenanceCalendar
{
    public static string Build(StatusPageState publicState)
    {
        var page = publicState.Page;
        var items = publicState.ScheduledMaintenances
            .OrderBy(i => i.ScheduledFor ?? i.CreatedAt)
            .ThenBy(i => i.Name)
            .ToList();
        var sb = new StringBuilder();
        Line(sb, "BEGIN:VCALENDAR");
        Line(sb, "VERSION:2.0");
        Line(sb, "PRODID:-//Status Page//Maintenance//EN");
        Line(sb, "CALSCALE:GREGORIAN");
        Line(sb, "METHOD:PUBLISH");
        Fold(sb, "X-WR-CALNAME", $"{page.Name} scheduled maintenance");
        Fold(sb, "X-WR-TIMEZONE", string.IsNullOrWhiteSpace(page.TimeZone) ? PageTimeZone.DefaultId : page.TimeZone);
        foreach (var item in items)
        {
            var start = item.ScheduledFor ?? item.CreatedAt;
            var end = item.ScheduledUntil ?? start.AddHours(1);
            var latest = item.Updates.OrderByDescending(u => u.DisplayAt).FirstOrDefault()?.Body ?? "";
            Line(sb, "BEGIN:VEVENT");
            Line(sb, $"UID:{item.Id}@{page.Id}");
            Line(sb, $"DTSTAMP:{UtcStamp(item.UpdatedAt)}");
            Line(sb, $"DTSTART:{UtcStamp(start)}");
            Line(sb, $"DTEND:{UtcStamp(end)}");
            Fold(sb, "SUMMARY", item.Name);
            if (!string.IsNullOrWhiteSpace(latest))
            {
                Fold(sb, "DESCRIPTION", latest);
            }

            Line(sb, $"URL:{page.Url.TrimEnd('/')}/incidents/{item.Id}");
            Line(sb, "END:VEVENT");
        }

        Line(sb, "END:VCALENDAR");
        return sb.ToString();
    }

    private static string UtcStamp(DateTimeOffset value) =>
        value.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss'Z'");

    private static void Line(StringBuilder sb, string text) => sb.Append(text).Append("\r\n");

    private static void Fold(StringBuilder sb, string name, string value)
    {
        var escaped = Escape(value);
        var raw = $"{name}:{escaped}";
        if (raw.Length <= 75)
        {
            Line(sb, raw);
            return;
        }

        sb.Append(raw.AsSpan(0, 75)).Append("\r\n");
        for (var i = 75; i < raw.Length; i += 74)
        {
            var len = Math.Min(74, raw.Length - i);
            sb.Append(' ').Append(raw.AsSpan(i, len)).Append("\r\n");
        }
    }

    private static string Escape(string value) =>
        value
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace(";", "\\;", StringComparison.Ordinal)
            .Replace(",", "\\,", StringComparison.Ordinal)
            .Replace("\r\n", "\\n", StringComparison.Ordinal)
            .Replace("\n", "\\n", StringComparison.Ordinal);
}
