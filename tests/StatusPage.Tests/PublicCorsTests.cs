using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using StatusPage.Api;

namespace StatusPage.Tests;

public class PublicCorsTests : IClassFixture<StatusPageFactory>, IClassFixture<CorsAllowListFactory>
{
    private readonly StatusPageFactory _factory;
    private readonly CorsAllowListFactory _allowListFactory;

    public PublicCorsTests(StatusPageFactory factory, CorsAllowListFactory allowListFactory)
    {
        _factory = factory;
        _allowListFactory = allowListFactory;
    }

    [Theory]
    [InlineData("/api/v2/summary.json")]
    [InlineData("/api/v2/status.json")]
    [InlineData("/api/status/uptime")]
    [InlineData("/api/status/components")]
    [InlineData("/embed")]
    [InlineData("/incidents.rss")]
    [InlineData("/incidents.atom")]
    [InlineData("/maintenance.ics")]
    public void Anonymous_get_list_is_cors_eligible(string path)
    {
        Assert.True(PublicCors.IsAnonymousGetPath(path));
        Assert.True(PublicCors.ShouldApply(new DefaultHttpContext { Request = { Method = "GET", Path = path } }.Request));
    }

    [Theory]
    [InlineData("/api/checks")]
    [InlineData("/api/checks/")]
    [InlineData("/api/checks/export")]
    [InlineData("/api/checks/import")]
    [InlineData("/api/checks/chk-github-status")]
    [InlineData("/api/checks/chk-github-status/run")]
    [InlineData("/api/checks/chk-github-status/results")]
    public void Check_api_never_matches_cors_paths(string path)
    {
        Assert.True(PublicCors.IsCheckApi(path));
        Assert.False(PublicCors.IsAnonymousGetPath(path));
        Assert.False(PublicCors.ShouldApply(new DefaultHttpContext { Request = { Method = "GET", Path = path } }.Request));
        Assert.False(PublicCors.ShouldApply(new DefaultHttpContext { Request = { Method = "POST", Path = path } }.Request));
        Assert.False(PublicCors.ShouldApply(new DefaultHttpContext { Request = { Method = "PATCH", Path = path } }.Request));
    }

    [Fact]
    public void Writes_never_match_cors_even_on_public_paths()
    {
        foreach (var method in new[] { "POST", "PUT", "PATCH", "DELETE" })
        {
            Assert.False(PublicCors.ShouldApply(new DefaultHttpContext
            {
                Request = { Method = method, Path = "/api/v2/summary.json" }
            }.Request));
        }
    }

    [Fact]
    public async Task Get_summary_has_acao_star_when_allow_list_is_empty()
    {
        using var client = _factory.CreateClient();
        using var response = await client.GetAsync("/api/v2/summary.json");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("*", Acao(response));
    }

    [Fact]
    public async Task Post_checks_does_not_have_acao()
    {
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("Origin", "https://evil.example");
        client.DefaultRequestHeaders.Add("X-Api-Key", "dev-key");
        using var response = await client.PostAsJsonAsync("/api/checks", new
        {
            name = "cors-write-probe",
            componentId = "github-status",
            type = "tcp",
            intervalSeconds = 15,
            timeoutSeconds = 2,
            target = new { host = "127.0.0.1", port = 9 }
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Null(Acao(response));
    }

    [Fact]
    public async Task Check_export_run_and_patch_never_have_acao()
    {
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("Origin", "https://widget.example");
        client.DefaultRequestHeaders.Add("X-Api-Key", "dev-key");

        using var export = await client.GetAsync("/api/checks/export");
        Assert.Equal(HttpStatusCode.OK, export.StatusCode);
        Assert.Null(Acao(export));

        using var created = await client.PostAsJsonAsync("/api/checks", new
        {
            name = "cors-run-probe",
            componentId = "github-status",
            type = "tcp",
            intervalSeconds = 15,
            timeoutSeconds = 2,
            target = new { host = "127.0.0.1", port = 9 }
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        using var createdDoc = JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        var id = createdDoc.RootElement.GetProperty("id").GetString();
        Assert.False(string.IsNullOrWhiteSpace(id));
        Assert.Null(Acao(created));

        using var patch = await client.PatchAsJsonAsync($"/api/checks/{id}", new { enabled = true });
        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);
        Assert.Null(Acao(patch));

        using var run = await client.PostAsJsonAsync($"/api/checks/{id}/run", new { });
        Assert.True((int)run.StatusCode is >= 200 and < 500);
        Assert.Null(Acao(run));
    }

    [Fact]
    public async Task Cors_status_components_stays_for_public()
    {
        using var operatorClient = _factory.CreateClient();
        operatorClient.DefaultRequestHeaders.Add("X-Api-Key", "dev-key");
        using var created = await operatorClient.PostAsJsonAsync("/api/checks", new
        {
            name = "cors-internal-probe",
            componentId = "cors-internal-db",
            componentName = "CORS internal database",
            type = "tcp",
            intervalSeconds = 15,
            timeoutSeconds = 2,
            target = new { host = "10.0.0.8", port = 5432 }
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);

        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("Origin", "https://docs.example");
        using var response = await client.GetAsync("/api/status/components");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("*", Acao(response));

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var ids = doc.RootElement.EnumerateArray().Select(row => row.GetProperty("componentId").GetString()).ToList();
        Assert.DoesNotContain("cors-internal-db", ids);
        Assert.DoesNotContain("local-health", ids);
        Assert.Contains("github-status", ids);
    }

    [Fact]
    public async Task Allow_list_rejects_bad_origins()
    {
        using var client = _allowListFactory.CreateClient();
        var badOrigins = new[]
        {
            "https://evil.example",
            "https://widget.example.attacker.test",
            "http://widget.example",
            "https://widget.example.evil.com",
            "null"
        };

        foreach (var origin in badOrigins)
        {
            using var get = new HttpRequestMessage(HttpMethod.Get, "/api/v2/summary.json");
            get.Headers.TryAddWithoutValidation("Origin", origin);
            using var getResponse = await client.SendAsync(get);
            Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
            Assert.Null(Acao(getResponse));

            using var options = new HttpRequestMessage(HttpMethod.Options, "/api/v2/summary.json");
            options.Headers.TryAddWithoutValidation("Origin", origin);
            using var optionsResponse = await client.SendAsync(options);
            Assert.Equal(HttpStatusCode.Forbidden, optionsResponse.StatusCode);
            Assert.Null(Acao(optionsResponse));
        }

        using var allowed = new HttpRequestMessage(HttpMethod.Get, "/api/v2/summary.json");
        allowed.Headers.TryAddWithoutValidation("Origin", "https://widget.example");
        using var allowedResponse = await client.SendAsync(allowed);
        Assert.Equal(HttpStatusCode.OK, allowedResponse.StatusCode);
        Assert.Equal("https://widget.example", Acao(allowedResponse));
    }

    [Fact]
    public void Empty_allow_list_means_star()
    {
        var emptyFile = Path.Combine(Path.GetTempPath(), $"cors-empty-{Guid.NewGuid():N}.json");
        File.WriteAllText(emptyFile, """{"allowedOrigins":[]}""");
        var options = PublicCorsOptions.Load(new ConfigurationBuilder().Build(), emptyFile);
        Assert.True(options.AllowAny);
        Assert.True(options.Allows("https://anywhere.example"));
        Assert.Equal("*", options.AllowOriginValue("https://anywhere.example"));
    }

    private static string? Acao(HttpResponseMessage response) =>
        response.Headers.TryGetValues("Access-Control-Allow-Origin", out var values)
            ? Assert.Single(values)
            : null;
}

public sealed class CorsAllowListFactory : StatusPageFactory
{
    protected override IEnumerable<KeyValuePair<string, string?>> ExtraSettings() =>
    [
        new("StatusPage:CorsAllowedOrigins:0", "https://widget.example")
    ];
}
