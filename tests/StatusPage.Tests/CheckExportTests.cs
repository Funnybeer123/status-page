using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using StatusPage.Api;
using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Tests;

public class CheckExportTests : IClassFixture<StatusPageFactory>
{
    private const string SecretHeader = "Bearer export-secret-value-9f3";
    private readonly StatusPageFactory _factory;

    public CheckExportTests(StatusPageFactory factory) => _factory = factory;

    [Fact]
    public async Task Anonymous_export_is_401()
    {
        using var client = _factory.CreateClient();
        using var response = await client.GetAsync("/api/checks/export");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("chk-github-status", body);
        Assert.DoesNotContain(SecretHeader, body);
    }

    [Fact]
    public async Task Operator_export_includes_internals_and_redacts_secret_headers()
    {
        using var client = OperatorClient();
        using var created = await client.PostAsJsonAsync("/api/checks", new
        {
            name = "export-secret-probe",
            componentId = "github-status",
            type = "https",
            intervalSeconds = 60,
            timeoutSeconds = 10,
            target = new { url = "https://www.githubstatus.com/api/v2/status.json" },
            http = new
            {
                expectedStatus = new[] { 200 },
                headers = new Dictionary<string, string>
                {
                    ["Authorization"] = SecretHeader,
                    ["Accept"] = "application/json"
                }
            }
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);

        using var internalCheck = await client.PostAsJsonAsync("/api/checks", new
        {
            name = "export-internal-probe",
            componentId = "export-internal-leaf",
            componentName = "Export internal leaf",
            type = "tcp",
            intervalSeconds = 15,
            timeoutSeconds = 2,
            target = new { host = "10.4.4.4", port = 5432 }
        });
        Assert.Equal(HttpStatusCode.Created, internalCheck.StatusCode);

        using var export = await client.GetAsync("/api/checks/export");
        Assert.Equal(HttpStatusCode.OK, export.StatusCode);
        var json = await export.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var checks = doc.RootElement.GetProperty("checks").EnumerateArray().ToList();
        Assert.Contains(checks, c => c.GetProperty("id").GetString() == "chk-local-health");
        Assert.Contains(checks, c => c.GetProperty("name").GetString() == "export-internal-probe");
        var secretProbe = Assert.Single(checks, c => c.GetProperty("name").GetString() == "export-secret-probe");
        var headers = secretProbe.GetProperty("http").GetProperty("headers");
        Assert.Equal(SecretHeaders.RedactedValue, headers.GetProperty("Authorization").GetString());
        Assert.Equal("application/json", headers.GetProperty("Accept").GetString());
        Assert.DoesNotContain(SecretHeader, json);

        using var page = await client.GetAsync("/operator");
        var html = await page.Content.ReadAsStringAsync();
        Assert.DoesNotContain(SecretHeader, html);
        Assert.DoesNotContain("export-secret-value-9f3", html);
    }

    [Fact]
    public async Task Operator_import_is_create_if_missing_and_keeps_existing_host()
    {
        using var client = OperatorClient();
        using var created = await client.PostAsJsonAsync("/api/checks", new
        {
            name = "import-existing-host",
            componentId = "import-host-leaf",
            componentName = "Import host leaf",
            type = "tcp",
            intervalSeconds = 15,
            timeoutSeconds = 2,
            target = new { host = "10.1.2.3", port = 5432 }
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        using var createdDoc = JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        var existingId = createdDoc.RootElement.GetProperty("id").GetString();

        using var imported = await client.PostAsJsonAsync("/api/checks/import", new
        {
            checks = new object[]
            {
                new
                {
                    id = existingId,
                    name = "import-renamed",
                    componentId = "import-host-leaf",
                    componentName = "Import host leaf",
                    type = "tcp",
                    intervalSeconds = 30,
                    timeoutSeconds = 3,
                    target = new { host = "10.9.9.9", port = 22 }
                },
                new
                {
                    name = "import-new-public",
                    componentId = "import-docs",
                    componentName = "Import docs",
                    type = "https",
                    intervalSeconds = 60,
                    timeoutSeconds = 10,
                    target = new { url = "https://learn.microsoft.com" },
                    http = new { expectedStatus = new[] { 200 } }
                }
            }
        });
        Assert.Equal(HttpStatusCode.OK, imported.StatusCode);
        using var importedDoc = JsonDocument.Parse(await imported.Content.ReadAsStringAsync());
        Assert.Equal(2, importedDoc.RootElement.GetProperty("imported").GetInt32());

        using var existing = await client.GetAsync($"/api/checks/{existingId}");
        using var existingDoc = JsonDocument.Parse(await existing.Content.ReadAsStringAsync());
        Assert.Equal("import-renamed", existingDoc.RootElement.GetProperty("name").GetString());
        Assert.Equal("10.1.2.3", existingDoc.RootElement.GetProperty("target").GetProperty("host").GetString());
        Assert.Equal(5432, existingDoc.RootElement.GetProperty("target").GetProperty("port").GetInt32());

        using var list = await client.GetAsync("/api/checks");
        using var listDoc = JsonDocument.Parse(await list.Content.ReadAsStringAsync());
        Assert.Contains(listDoc.RootElement.EnumerateArray(),
            c => c.GetProperty("name").GetString() == "import-new-public"
                 && c.GetProperty("componentId").GetString() == "import-docs");
    }

    [Fact]
    public void Redacted_import_headers_do_not_overwrite_secrets()
    {
        var existing = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["Authorization"] = SecretHeader
        };
        var incoming = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["Authorization"] = SecretHeaders.RedactedValue,
            ["Accept"] = "application/json"
        };
        var merged = SecretHeaders.MergeImport(incoming, existing);
        Assert.Equal(SecretHeader, merged["Authorization"]);
        Assert.Equal("application/json", merged["Accept"]);
    }

    [Fact]
    public async Task Viewer_export_omits_internals_and_all_headers()
    {
        using var factory = new EntraOperatorFactory();
        using var setup = factory.CreateClient();
        setup.DefaultRequestHeaders.Add("X-Api-Key", "dev-key");
        using var created = await setup.PostAsJsonAsync("/api/checks", new
        {
            name = "viewer-export-secret",
            componentId = "github-status",
            type = "https",
            intervalSeconds = 60,
            timeoutSeconds = 10,
            target = new { url = "https://www.githubstatus.com/api/v2/status.json" },
            http = new
            {
                expectedStatus = new[] { 200 },
                headers = new Dictionary<string, string> { ["Authorization"] = SecretHeader }
            }
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        using var internalCheck = await setup.PostAsJsonAsync("/api/checks", new
        {
            name = "viewer-export-internal",
            componentId = "viewer-internal-leaf",
            componentName = "Viewer internal leaf",
            type = "tcp",
            intervalSeconds = 15,
            timeoutSeconds = 2,
            target = new { host = "10.5.5.5", port = 5432 }
        });
        Assert.Equal(HttpStatusCode.Created, internalCheck.StatusCode);

        factory.Users.User = new System.Security.Claims.ClaimsPrincipal(
            new System.Security.Claims.ClaimsIdentity(
                [new System.Security.Claims.Claim("roles", "StatusViewer")],
                "oidc"));
        using var viewer = factory.CreateClient();
        using var export = await viewer.GetAsync("/api/checks/export");
        Assert.Equal(HttpStatusCode.OK, export.StatusCode);
        var json = await export.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var checks = doc.RootElement.GetProperty("checks").EnumerateArray().ToList();
        Assert.Contains(checks, c => c.GetProperty("id").GetString() == "chk-github-status");
        Assert.DoesNotContain(checks, c => c.GetProperty("id").GetString() == "chk-local-health");
        Assert.DoesNotContain(checks, c => c.GetProperty("name").GetString() == "viewer-export-internal");
        var publicProbe = Assert.Single(checks, c => c.GetProperty("name").GetString() == "viewer-export-secret");
        Assert.True(publicProbe.GetProperty("http").TryGetProperty("headers", out var headers));
        Assert.Equal(JsonValueKind.Null, headers.ValueKind);
        Assert.DoesNotContain(SecretHeader, json);
        Assert.DoesNotContain("Authorization", json, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Viewer_gets_404_on_internal_check_operator_gets_200()
    {
        using var factory = new EntraOperatorFactory();
        using var setup = factory.CreateClient();
        setup.DefaultRequestHeaders.Add("X-Api-Key", "dev-key");
        using var created = await setup.PostAsJsonAsync("/api/checks", new
        {
            name = "viewer-404-internal",
            componentId = "viewer-404-leaf",
            componentName = "Viewer 404 leaf",
            type = "tcp",
            intervalSeconds = 15,
            timeoutSeconds = 2,
            target = new { host = "10.6.6.6", port = 5432 }
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        using var createdDoc = JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        var internalId = createdDoc.RootElement.GetProperty("id").GetString();
        Assert.False(string.IsNullOrWhiteSpace(internalId));

        using var operatorGet = await setup.GetAsync($"/api/checks/{internalId}");
        Assert.Equal(HttpStatusCode.OK, operatorGet.StatusCode);
        using var operatorDoc = JsonDocument.Parse(await operatorGet.Content.ReadAsStringAsync());
        Assert.Equal("viewer-404-internal", operatorDoc.RootElement.GetProperty("name").GetString());
        Assert.Equal("10.6.6.6", operatorDoc.RootElement.GetProperty("target").GetProperty("host").GetString());
        using var operatorResults = await setup.GetAsync($"/api/checks/{internalId}/results");
        Assert.Equal(HttpStatusCode.OK, operatorResults.StatusCode);
        using var operatorList = await setup.GetAsync("/api/checks");
        using var operatorListDoc = JsonDocument.Parse(await operatorList.Content.ReadAsStringAsync());
        Assert.Contains(operatorListDoc.RootElement.EnumerateArray(),
            c => c.GetProperty("id").GetString() == internalId);

        factory.Users.User = new System.Security.Claims.ClaimsPrincipal(
            new System.Security.Claims.ClaimsIdentity(
                [new System.Security.Claims.Claim("roles", "StatusViewer")],
                "oidc"));
        using var viewer = factory.CreateClient();
        using var viewerGet = await viewer.GetAsync($"/api/checks/{internalId}");
        Assert.Equal(HttpStatusCode.NotFound, viewerGet.StatusCode);
        var viewerBody = await viewerGet.Content.ReadAsStringAsync();
        Assert.DoesNotContain("10.6.6.6", viewerBody);
        Assert.DoesNotContain("viewer-404-internal", viewerBody);
        using var viewerResults = await viewer.GetAsync($"/api/checks/{internalId}/results");
        Assert.Equal(HttpStatusCode.NotFound, viewerResults.StatusCode);
        using var viewerLocal = await viewer.GetAsync("/api/checks/chk-local-health");
        Assert.Equal(HttpStatusCode.NotFound, viewerLocal.StatusCode);

        using var viewerList = await viewer.GetAsync("/api/checks");
        Assert.Equal(HttpStatusCode.OK, viewerList.StatusCode);
        var listJson = await viewerList.Content.ReadAsStringAsync();
        using var viewerListDoc = JsonDocument.Parse(listJson);
        Assert.DoesNotContain(viewerListDoc.RootElement.EnumerateArray(),
            c => c.GetProperty("id").GetString() == internalId);
        Assert.DoesNotContain(viewerListDoc.RootElement.EnumerateArray(),
            c => c.GetProperty("id").GetString() == "chk-local-health");
        Assert.Contains(viewerListDoc.RootElement.EnumerateArray(),
            c => c.GetProperty("id").GetString() == "chk-github-status");
        Assert.DoesNotContain("Authorization", listJson, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("10.6.6.6", listJson);

        using var publicGet = await viewer.GetAsync("/api/checks/chk-github-status");
        Assert.Equal(HttpStatusCode.OK, publicGet.StatusCode);
        using var publicDoc = JsonDocument.Parse(await publicGet.Content.ReadAsStringAsync());
        Assert.True(publicDoc.RootElement.GetProperty("http").TryGetProperty("headers", out var headers));
        Assert.Equal(JsonValueKind.Null, headers.ValueKind);

        using var page = await viewer.GetAsync("/operator");
        Assert.Equal(HttpStatusCode.OK, page.StatusCode);
        var html = await page.Content.ReadAsStringAsync();
        Assert.DoesNotContain("viewer-404-internal", html);
        Assert.DoesNotContain("10.6.6.6", html);
        Assert.DoesNotContain("Viewer 404 leaf", html);
        Assert.DoesNotContain("Run now", html);
        Assert.DoesNotContain("Add a check", html);
        Assert.DoesNotContain("href=\"/operator?editCheck=", html);

        using var patch = await viewer.PatchAsJsonAsync($"/api/checks/{internalId}", new { enabled = false });
        Assert.Equal(HttpStatusCode.Forbidden, patch.StatusCode);
        using var put = await viewer.PutAsJsonAsync($"/api/checks/{internalId}", new
        {
            name = "blocked",
            componentId = "viewer-404-leaf",
            type = "tcp",
            target = new { host = "10.6.6.6", port = 5432 }
        });
        Assert.Equal(HttpStatusCode.Forbidden, put.StatusCode);
        using var run = await viewer.PostAsJsonAsync($"/api/checks/{internalId}/run", new { });
        Assert.Equal(HttpStatusCode.Forbidden, run.StatusCode);
        using var import = await viewer.PostAsJsonAsync("/api/checks/import", new
        {
            checks = new[]
            {
                new
                {
                    name = "blocked-import",
                    componentId = "github-status",
                    type = "https",
                    target = new { url = "https://www.githubstatus.com/api/v2/status.json" }
                }
            }
        });
        Assert.Equal(HttpStatusCode.Forbidden, import.StatusCode);
    }

    private HttpClient OperatorClient()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Api-Key", "dev-key");
        return client;
    }
}
