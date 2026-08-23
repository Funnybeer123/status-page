using StatusPage.Domain;

namespace StatusPage.Services;

/// <summary>
/// Per-check UTC mute window. While active the worker and POST /run skip the
/// probe. Hysteresis and auto-incidents do not move. Mute is not
/// under_maintenance and does not change component status by itself.
/// </summary>
public static class CheckMute
{
    public static bool IsActive(StatusCheck check, DateTimeOffset now) =>
        check.IsMuted(now);

    public static void Apply(
        StatusCheck check,
        DateTimeOffset? mutedFrom,
        bool mutedFromSpecified,
        DateTimeOffset? mutedUntil,
        bool mutedUntilSpecified)
    {
        if (mutedFromSpecified)
        {
            check.MutedFrom = mutedFrom?.ToUniversalTime();
        }

        if (mutedUntilSpecified)
        {
            check.MutedUntil = mutedUntil?.ToUniversalTime();
        }

        if (check.MutedFrom is { } from && check.MutedUntil is { } until && until < from)
        {
            throw new ArgumentException("mutedUntil must be on or after mutedFrom.");
        }
    }

    public static StatusCheck? NextWindow(IEnumerable<StatusCheck> checks, DateTimeOffset now) =>
        checks
            .Where(c => c.MutedFrom is not null && c.MutedUntil is not null && c.MutedUntil >= now)
            .OrderBy(c => c.MutedFrom)
            .ThenBy(c => c.Name)
            .FirstOrDefault();
}
