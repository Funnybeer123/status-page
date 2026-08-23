using StatusPage.Contracts;
using StatusPage.Domain;

namespace StatusPage.Services;

/// <summary>
/// Locked v1 probe rollup. Probes never emit degraded_performance.
/// </summary>
public static class CheckRollup
{
    public static CheckState NextState(
        CheckState current,
        bool ok,
        int consecutiveSuccesses,
        int consecutiveFailures,
        int successThreshold = CheckContract.DefaultSuccessThreshold,
        int failureThreshold = CheckContract.DefaultFailureThreshold)
    {
        if (!ok && consecutiveFailures >= Math.Max(1, failureThreshold))
        {
            return CheckState.Down;
        }

        if (ok && consecutiveSuccesses >= Math.Max(1, successThreshold))
        {
            return CheckState.Up;
        }

        return current;
    }

    /// <summary>
    /// null means leave the operator-set status (zero enabled checks).
    /// </summary>
    public static ComponentStatus? FromCheckStates(IReadOnlyList<CheckState> states)
    {
        if (states.Count == 0)
        {
            return null;
        }

        if (states.All(s => s == CheckState.Up))
        {
            return ComponentStatus.Operational;
        }

        if (states.All(s => s == CheckState.Down))
        {
            return ComponentStatus.MajorOutage;
        }

        return ComponentStatus.PartialOutage;
    }
}
