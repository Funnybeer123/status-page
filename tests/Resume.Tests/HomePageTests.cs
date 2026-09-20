using System.Net;
using EvanBeer.Resume.Data;

namespace Resume.Tests;

public sealed class HomePageTests : IClassFixture<ResumeWebFactory>
{
    private readonly HttpClient _client;

    public HomePageTests(ResumeWebFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Home_page_renders_confirmed_roles_and_incomplete_gaps()
    {
        var response = await _client.GetAsync("/");
        var html = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("Evan Beer", html);
        Assert.Contains("UBT", html);
        Assert.Contains("DevOps Manager / Senior Cloud Infrastructure Engineer", html);
        Assert.Contains("Last 2 years", html);
        Assert.Contains("KBR", html);
        Assert.Contains("Cloud Architect", html);
        Assert.Contains("2023 – 2025", html);
        Assert.Contains("1½ years", html);
        Assert.Contains(ResumeContent.NeedsInputLabel, html);
        Assert.Contains("Phone — not provided", html);
        Assert.Contains("No sourced schools", html);
        Assert.Contains("Earlier experience", html);
        Assert.DoesNotContain("Archetect", html);
        Assert.DoesNotContain("mailto:", html, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("@gmail.com", html, StringComparison.OrdinalIgnoreCase);
    }
}
