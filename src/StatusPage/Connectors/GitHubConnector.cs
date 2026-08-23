using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using StatusPage.Domain;

namespace StatusPage.Connectors;

public sealed class GitHubConnector(HttpClient http, IConfiguration configuration) : IStatusConnector
{
    public const string PublicStatusUrl = "https://www.githubstatus.com/api/v2/status.json";
    public const string ConnectorIdValue = "github";

    public string Id => ConnectorIdValue;
    public string DisplayName => "GitHub";
    public string ComponentId => "github-status";

    public async Task<ConnectorImportResult> ImportAsync(CancellationToken cancellationToken)
    {
        var status = ComponentStatus.Operational;
        var detail = "GitHub public status is reachable.";
        var events = new List<ConnectorEvent>();

        try
        {
            using var response = await http.GetAsync(PublicStatusUrl, cancellationToken);
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                status = ComponentStatus.MajorOutage;
                detail = $"GitHub status returned HTTP {(int)response.StatusCode}.";
            }
            else
            {
                (status, detail) = ParseStatus(body);
            }
        }
        catch (Exception ex)
        {
            status = ComponentStatus.MajorOutage;
            detail = Trim($"GitHub status failed: {ex.Message}");
        }

        var token = configuration["GITHUB_TOKEN"] ?? configuration["GitHub:Token"];
        var repo = configuration["GitHub:Repository"] ?? configuration["GitHub:Repo"];
        if (!string.IsNullOrWhiteSpace(token) && !string.IsNullOrWhiteSpace(repo))
        {
            try
            {
                var url = $"https://api.github.com/repos/{repo.Trim()}/actions/runs?per_page=1";
                using var request = new HttpRequestMessage(HttpMethod.Get, url);
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                request.Headers.UserAgent.ParseAdd("status-page-connector/1.0");
                request.Headers.Accept.ParseAdd("application/vnd.github+json");
                using var actions = await http.SendAsync(request, cancellationToken);
                if (actions.IsSuccessStatusCode)
                {
                    var actionsBody = await actions.Content.ReadAsStringAsync(cancellationToken);
                    var (actionStatus, actionDetail) = ParseActions(actionsBody);
                    events.Add(new ConnectorEvent("github-actions", "GitHub Actions", actionDetail, actionStatus, DateTimeOffset.UtcNow));
                    if (actionStatus != ComponentStatus.Operational && status == ComponentStatus.Operational)
                    {
                        status = actionStatus;
                        detail = actionDetail;
                    }
                }
            }
            catch
            {
                // Public status already populated the import.
            }
        }

        if (status != ComponentStatus.Operational)
        {
            events.Insert(0, new ConnectorEvent("github-public", "GitHub public status", detail, status, DateTimeOffset.UtcNow));
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

    internal static (ComponentStatus Status, string Detail) ParseStatus(string json)
    {
        using var doc = JsonDocument.Parse(json);
        var node = doc.RootElement.TryGetProperty("status", out var status) ? status : doc.RootElement;
        var indicator = node.TryGetProperty("indicator", out var ind) ? ind.GetString() : null;
        var description = node.TryGetProperty("description", out var desc) ? desc.GetString() : indicator;
        return (MapIndicator(indicator), description ?? "GitHub status");
    }

    internal static ComponentStatus MapIndicator(string? indicator) =>
        (indicator ?? "").Trim().ToLowerInvariant() switch
        {
            "" or "none" or "operational" => ComponentStatus.Operational,
            "minor" => ComponentStatus.PartialOutage,
            "major" or "critical" => ComponentStatus.MajorOutage,
            _ => ComponentStatus.PartialOutage
        };

    internal static (ComponentStatus Status, string Detail) ParseActions(string json)
    {
        using var doc = JsonDocument.Parse(json);
        if (!doc.RootElement.TryGetProperty("workflow_runs", out var runs) || runs.GetArrayLength() == 0)
        {
            return (ComponentStatus.Operational, "No recent GitHub Actions runs.");
        }

        var run = runs[0];
        var conclusion = run.TryGetProperty("conclusion", out var c) ? c.GetString() : null;
        var name = run.TryGetProperty("name", out var n) ? n.GetString() : "workflow";
        var mapped = (conclusion ?? "").ToLowerInvariant() switch
        {
            "success" or "neutral" or "skipped" or "" => ComponentStatus.Operational,
            "failure" or "timed_out" or "startup_failure" => ComponentStatus.PartialOutage,
            _ => ComponentStatus.Operational
        };
        return (mapped, $"{name}: {conclusion ?? "in progress"}");
    }

    private static string Trim(string value) =>
        value.Length <= 240 ? value : value[..240];
}
