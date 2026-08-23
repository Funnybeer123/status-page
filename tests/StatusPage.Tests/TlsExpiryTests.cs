using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Tests;

public class TlsExpiryTests
{
    [Fact]
    public void Fails_when_certificate_expires_inside_threshold()
    {
        var now = DateTimeOffset.Parse("2026-08-23T00:00:00Z");
        var result = TlsExpiryEvaluator.Evaluate(now.AddDays(-10), now.AddDays(5), 14, now);
        Assert.Equal(CheckResultStatus.Fail, result.Status);
        Assert.Contains("expires", result.Error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Passes_when_certificate_has_enough_days()
    {
        var now = DateTimeOffset.Parse("2026-08-23T00:00:00Z");
        var result = TlsExpiryEvaluator.Evaluate(now.AddDays(-10), now.AddDays(30), 14, now);
        Assert.Equal(CheckResultStatus.Ok, result.Status);
    }

    [Fact]
    public void Fails_when_certificate_already_expired()
    {
        var now = DateTimeOffset.Parse("2026-08-23T00:00:00Z");
        var result = TlsExpiryEvaluator.Evaluate(now.AddDays(-40), now.AddDays(-1), 14, now);
        Assert.Equal(CheckResultStatus.Fail, result.Status);
        Assert.Contains("expired", result.Error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Fails_when_certificate_is_not_yet_valid()
    {
        var now = DateTimeOffset.Parse("2026-08-23T00:00:00Z");
        var result = TlsExpiryEvaluator.Evaluate(now.AddDays(1), now.AddDays(90), 14, now);
        Assert.Equal(CheckResultStatus.Fail, result.Status);
        Assert.Contains("not valid until", result.Error, StringComparison.OrdinalIgnoreCase);
    }
}
