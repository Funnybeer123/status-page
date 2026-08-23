using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using StatusPage.Domain;

namespace StatusPage.Connectors;

public sealed class AzureDevOpsConnector(HttpClient http, IConfiguration configuration) : IStatusConnector
{
    public const string PublicHealthUrl = "https://status.dev.azure.com/_apis/status/health?api-version=7.1-preview.1";
    public const string ConnectorIdValue = "azure-devops";

    public string Id => ConnectorIdValue;
    public string DisplayName => "Azure DevOps";
    public string ComponentId => "azure-devops-status";

    public async Task<ConnectorImportResult> ImportAsync(CancellationToken cancellationToken)
    {
        var status = ComponentStatus.Operational;
        var detail = "Azure DevOps public health is reachable.";
        var events = new List<ConnectorEvent>();

        try
        {
            using var response = await http.GetAsync(PublicHealthUrl, cancellationToken);
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                status = ComponentStatus.MajorOutage;
                detail = $"Azure DevOps public health returned HTTP {(int)response.StatusCode}.";
            }
            else
            {
                (status, detail) = ParseHealth(body);
            }
        }
        catch (Exception ex)
        {
            status = ComponentStatus.MajorOutage;
            detail = Trim($"Azure DevOps public health failed: {ex.Message}");
        }

        var org = configuration["AzureDevOps:Organization"] ?? configuration["AZURE_DEVOPS_ORG"];
        var pat = configuration["AZURE_DEVOPS_PAT"] ?? configuration["AzureDevOps:Pat"];
        var projectUrl = configuration["AzureDevOps:StatusUrl"];
        if (!string.IsNullOrWhiteSpace(pat) && (!string.IsNullOrWhiteSpace(org) || !string.IsNullOrWhiteSpace(projectUrl)))
        {
            try
            {
                var url = !string.IsNullOrWhiteSpace(projectUrl)
                    ? projectUrl
                    : $"https://dev.azure.com/{Uri.EscapeDataString(org!.Trim())}/_apis/status?api-version=7.1";
                using var request = new HttpRequestMessage(HttpMethod.Get, url);
                var token = Convert.ToBase64String(Encoding.ASCII.GetBytes(":" + pat));
                request.Headers.Authorization = new AuthenticationHeaderValue("Basic", token);
                using var orgResponse = await http.SendAsync(request, cancellationToken);
                if (orgResponse.IsSuccessStatusCode)
                {
                    var orgBody = await orgResponse.Content.ReadAsStringAsync(cancellationToken);
                    var (orgStatus, orgDetail) = ParseHealth(orgBody);
                    events.Add(new ConnectorEvent("ado-org", "Azure DevOps organization status", orgDetail, orgStatus, DateTimeOffset.UtcNow));
                    if (orgStatus != ComponentStatus.Operational && status == ComponentStatus.Operational)
                    {
                        status = orgStatus;
                        detail = orgDetail;
                    }
                }
            }
            catch
            {
                // Public health already populated the import.
            }
        }

        if (status != ComponentStatus.Operational)
        {
            events.Insert(0, new ConnectorEvent("ado-public", "Azure DevOps public health", detail, status, DateTimeOffset.UtcNow));
        }

        return new ConnectorImportResult
        {
            ConnectorId = Id,
            DisplayName = DisplayName,
            ComponentId = ComponentId,
            Status = status,
            Detail = detail,
            ImportedAtUtc = DateTimeOffset.UtcNow,
            Events = events
        };
    }

    internal static (ComponentStatus Status, string Detail) ParseHealth(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var statusNode = root.TryGetProperty("status", out var s) ? s : root;
            var health = ReadString(statusNode, "health")
                         ?? ReadString(statusNode, "indicator")
                         ?? ReadString(root, "health");
            var message = ReadString(statusNode, "message")
                          ?? ReadString(statusNode, "description")
                          ?? health
                          ?? "Azure DevOps health";
            return (MapHealth(health), message);
        }
        catch (JsonException)
        {
            return (ComponentStatus.PartialOutage, "Azure DevOps health payload was not JSON.");
        }
    }

    internal static ComponentStatus MapHealth(string? health)
    {
        return (health ?? "").Trim().ToLowerInvariant() switch
        {
            "" or "healthy" or "none" or "operational" => ComponentStatus.Operational,
            "degraded" or "minor" or "warning" => ComponentStatus.PartialOutage,
            "unhealthy" or "major" or "critical" or "outage" => ComponentStatus.MajorOutage,
            _ => ComponentStatus.PartialOutage
        };
    }

    private static string? ReadString(JsonElement element, string name) =>
        element.ValueKind == JsonValueKind.Object && element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;

    private static string Trim(string value) =>
        value.Length <= 240 ? value : value[..240];
}
