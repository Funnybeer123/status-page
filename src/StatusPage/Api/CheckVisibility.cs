using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Api;

/// <summary>
/// StatusViewer sees the same public-only check set as export.
/// Internal-host probes are operator-only.
/// </summary>
public static class CheckVisibility
{
    public static bool IsOperator(HttpContext http) => OperatorAuth.IsOperator(http);

    public static bool IncludeHeaders(HttpContext http) => OperatorAuth.IsOperator(http);

    public static IEnumerable<StatusCheck> Visible(IEnumerable<StatusCheck> checks, HttpContext http)
    {
        if (OperatorAuth.IsOperator(http))
        {
            return checks;
        }

        return checks.Where(check => !InternalHost.IsInternalCheck(check));
    }

    public static StatusCheck? FindVisible(IStatusStore store, string id, HttpContext http)
    {
        var check = store.FindCheck(id);
        if (check is null)
        {
            return null;
        }

        if (OperatorAuth.IsOperator(http) || !InternalHost.IsInternalCheck(check))
        {
            return check;
        }

        return null;
    }
}
