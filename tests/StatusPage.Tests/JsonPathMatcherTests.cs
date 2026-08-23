using StatusPage.Services;

namespace StatusPage.Tests;

public class JsonPathMatcherTests
{
    [Fact]
    public void Reads_nested_property()
    {
        Assert.True(JsonPathMatcher.TryGetValue(
            """{"status":{"indicator":"none"}}""",
            "$.status.indicator",
            out var value,
            out var error), error);
        Assert.Equal("none", value);
    }

    [Fact]
    public void Reads_array_index()
    {
        Assert.True(JsonPathMatcher.TryGetValue(
            """{"items":[{"ok":true}]}""",
            "$.items[0].ok",
            out var value,
            out _), "path should resolve");
        Assert.Equal("true", value);
    }

    [Fact]
    public void Matches_expected_value()
    {
        Assert.True(JsonPathMatcher.Matches(
            """{"status":{"indicator":"none"}}""",
            "$.status.indicator",
            "none",
            out _,
            out var error), error);
    }

    [Fact]
    public void Fails_when_value_differs()
    {
        Assert.False(JsonPathMatcher.Matches(
            """{"status":{"indicator":"major"}}""",
            "$.status.indicator",
            "none",
            out var actual,
            out var error));
        Assert.Equal("major", actual);
        Assert.Contains("expected", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Fails_when_path_missing()
    {
        Assert.False(JsonPathMatcher.TryGetValue("{\"a\":1}", "$.missing", out _, out var error));
        Assert.Contains("missing", error, StringComparison.OrdinalIgnoreCase);
    }
}
