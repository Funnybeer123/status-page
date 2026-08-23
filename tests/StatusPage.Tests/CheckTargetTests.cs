using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Tests;

public class CheckTargetTests
{
    [Theory]
    [InlineData("https://example.com", "https", CheckType.Https)]
    [InlineData("http://127.0.0.1:5080/health", "http", CheckType.Http)]
    [InlineData("127.0.0.1:9", "tcp", CheckType.Tcp)]
    [InlineData("db.internal:5432", null, CheckType.Tcp)]
    public void Parses_supported_targets(string target, string? type, CheckType expected)
    {
        Assert.True(CheckTarget.TryParse(target, type, out var resolved, out var error), error);
        Assert.Equal(expected, resolved.Type);
    }

    [Theory]
    [InlineData("https://example.com,https://evil.example")]
    [InlineData("10.0.0.0/24")]
    [InlineData("ftp://example.com")]
    [InlineData("not-a-target")]
    [InlineData("host-without-port")]
    public void Rejects_scans_and_invalid_targets(string target)
    {
        Assert.False(CheckTarget.TryParse(target, null, out _, out var error));
        Assert.False(string.IsNullOrWhiteSpace(error));
    }
}
