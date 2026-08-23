using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace StatusPage.Tests;

public class OperatorAuthTests : IClassFixture<StatusPageFactory>
{
    private readonly StatusPageFactory _factory;

    public OperatorAuthTests(StatusPageFactory factory) => _factory = factory;

    [Fact]
    public async Task Entra_disabled_falls_back_to_api_key()
    {
        using var client = _factory.CreateClient();
        using var denied = await client.PostAsync("/api/checks",
            JsonContent.Create(new
            {
                name = "no-auth",
                componentId = "github-status",
                type = "https",
                target = new { url = "https://www.githubstatus.com/api/v2/status.json" }
            }));
        Assert.Equal(HttpStatusCode.Unauthorized, denied.StatusCode);

        using var authorized = _factory.CreateClient();
        authorized.DefaultRequestHeaders.Add("X-Api-Key", "dev-key");
        using var created = await authorized.PostAsync("/api/checks",
            JsonContent.Create(new
            {
                name = "any-url",
                componentId = "github-status",
                type = "https",
                intervalSeconds = 60,
                timeoutSeconds = 10,
                target = new { url = "https://www.githubstatus.com/api/v2/status.json" },
                http = new { expectedStatus = new[] { 200 }, jsonPath = "$.status.indicator", expectedJsonValue = "none" }
            }));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
    }

    [Fact]
    public async Task Operator_page_is_not_public_without_auth()
    {
        using var client = _factory.CreateClient();
        using var response = await client.GetAsync("/operator");
        var html = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("Operator sign-in", html);
        Assert.DoesNotContain("Add a check", html);
        Assert.DoesNotContain("Latest probe", html);

        using var noRedirect = _factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        using var raw = await noRedirect.GetAsync("/operator");
        Assert.Equal(HttpStatusCode.Redirect, raw.StatusCode);
        Assert.Contains("/operator/login", raw.Headers.Location?.ToString() ?? "");
    }

    [Fact]
    public async Task Operator_page_lists_checks_with_api_key()
    {
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Api-Key", "dev-key");
        using var response = await client.GetAsync("/operator");
        var html = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("Add a check", html);
        Assert.Contains("Microsoft Azure", html);
        Assert.Contains("internal", html);
        Assert.DoesNotContain("Subscribe", html, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Public_page_stays_anonymous()
    {
        using var client = _factory.CreateClient();
        using var response = await client.GetAsync("/");
        var html = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("Business Systems", html);
        Assert.DoesNotContain("Add a check", html);
        Assert.DoesNotContain("Operator sign-in", html);
    }
}
