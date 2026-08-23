using StatusPage.Contracts;
using StatusPage.Domain;

namespace StatusPage.Services;

public static class TlsExpiryEvaluator
{
    public static CheckResult Evaluate(
        DateTimeOffset notBefore,
        DateTimeOffset notAfter,
        int warnDays,
        DateTimeOffset now)
    {
        var days = Math.Max(1, warnDays);
        if (now < notBefore)
        {
            return Fail(now, $"Certificate is not valid until {notBefore:u}.");
        }

        if (now > notAfter)
        {
            return Fail(now, $"Certificate expired at {notAfter:u}.");
        }

        var remaining = notAfter - now;
        if (remaining < TimeSpan.FromDays(days))
        {
            return Fail(now, $"Certificate expires in {(int)remaining.TotalDays} day(s); threshold is {days} days.");
        }

        return new CheckResult
        {
            Status = CheckResultStatus.Ok,
            LatencyMs = 0,
            CheckedAtUtc = now
        };
    }

    private static CheckResult Fail(DateTimeOffset now, string error) => new()
    {
        Status = CheckResultStatus.Fail,
        LatencyMs = 0,
        Error = error.Length <= 240 ? error : error[..240],
        CheckedAtUtc = now
    };

    public static int NormalizeDays(int? days) =>
        days is > 0 and <= 3650 ? days.Value : CheckContract.DefaultTlsExpiryDays;
}
