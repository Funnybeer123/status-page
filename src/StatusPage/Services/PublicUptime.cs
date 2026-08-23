using StatusPage.Domain;

namespace StatusPage.Services;

public sealed record DayUptime(DateOnly Date, int Ok, int Fail)
{
    public bool HasSamples => Ok + Fail > 0;
    public bool Failed => Fail > 0;
}

public sealed record LeafUptime(
    string Id,
    string Name,
    int Ok,
    int Fail,
    double? UptimePercent,
    IReadOnlyList<DayUptime> Days);

/// <summary>
/// Public leaf uptime from persisted check-results.json samples.
/// Percent is ok/(ok+fail) over the last 15 UTC days. Page IANA time zone
/// is labels and page.time_zone only — it does not shift these UTC buckets.
/// No samples means no percent — never 100. Mute windows do not invent ok samples.
/// </summary>
public static class PublicUptime
{
    public static bool DayFailed(
        IEnumerable<CheckResultSample> samples,
        IEnumerable<StatusCheck> checks,
        DateOnly day) =>
        SamplesOnDay(samples, checks, day).Any(sample => sample.ResultStatus == CheckResultStatus.Fail);

    public static bool DayHasSamples(
        IEnumerable<CheckResultSample> samples,
        IEnumerable<StatusCheck> checks,
        DateOnly day) =>
        SamplesOnDay(samples, checks, day).Any();

    public static double? Percent(int ok, int fail) =>
        ok + fail == 0
            ? null
            : Math.Round(100.0 * ok / (ok + fail), 1, MidpointRounding.AwayFromZero);

    public static IReadOnlyList<DateOnly> UtcDays(DateTimeOffset now)
    {
        var today = DateOnly.FromDateTime(now.UtcDateTime);
        return Enumerable.Range(0, CheckResultStore.PublicBarDays)
            .Select(offset => today.AddDays(-offset))
            .ToList();
    }

    public static IReadOnlyList<LeafUptime> ForPublicLeaves(
        StatusPageState publicState,
        IEnumerable<StatusCheck> checks,
        IEnumerable<CheckResultSample> samples,
        DateTimeOffset now)
    {
        var enabledPublic = EnabledPublic(checks).ToList();
        var days = UtcDays(now);
        var start = days[^1];
        var today = days[0];
        var publicIds = enabledPublic.Select(c => c.Id).ToHashSet(StringComparer.Ordinal);
        var relevant = samples
            .Where(sample => publicIds.Contains(sample.CheckId))
            .Where(sample =>
            {
                var day = DateOnly.FromDateTime(sample.CheckedAtUtc.UtcDateTime);
                return day >= start && day <= today;
            })
            .ToList();

        return publicState.Components
            .Where(c => !c.Group)
            .OrderBy(c => c.Position)
            .ThenBy(c => c.Name)
            .Select(leaf =>
            {
                var leafCheckIds = enabledPublic
                    .Where(c => c.ComponentId == leaf.Id)
                    .Select(c => c.Id)
                    .ToHashSet(StringComparer.Ordinal);
                var leafSamples = relevant.Where(s => leafCheckIds.Contains(s.CheckId)).ToList();
                var ok = leafSamples.Count(s => s.ResultStatus == CheckResultStatus.Ok);
                var fail = leafSamples.Count(s => s.ResultStatus == CheckResultStatus.Fail);
                var dayRows = days
                    .Select(day =>
                    {
                        var onDay = leafSamples.Where(s => DateOnly.FromDateTime(s.CheckedAtUtc.UtcDateTime) == day);
                        return new DayUptime(
                            day,
                            onDay.Count(s => s.ResultStatus == CheckResultStatus.Ok),
                            onDay.Count(s => s.ResultStatus == CheckResultStatus.Fail));
                    })
                    .ToList();
                return new LeafUptime(leaf.Id, leaf.Name, ok, fail, Percent(ok, fail), dayRows);
            })
            .ToList();
    }

    public static string? FormatPercent(double? percent) =>
        percent is null ? null : percent.Value.ToString("0.0", System.Globalization.CultureInfo.InvariantCulture) + "%";

    private static IEnumerable<CheckResultSample> SamplesOnDay(
        IEnumerable<CheckResultSample> samples,
        IEnumerable<StatusCheck> checks,
        DateOnly day)
    {
        var publicIds = EnabledPublic(checks).Select(c => c.Id).ToHashSet(StringComparer.Ordinal);
        return samples.Where(sample =>
            publicIds.Contains(sample.CheckId)
            && DateOnly.FromDateTime(sample.CheckedAtUtc.UtcDateTime) == day);
    }

    private static IEnumerable<StatusCheck> EnabledPublic(IEnumerable<StatusCheck> checks) =>
        checks.Where(c => c.Enabled && !InternalHost.IsInternalCheck(c));
}
