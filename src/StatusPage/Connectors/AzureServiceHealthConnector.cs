using System.Net.Http.Headers;
using System.Text.Json;
using System.Xml.Linq;
using Microsoft.Extensions.Configuration;
using StatusPage.Domain;

namespace StatusPage.Connectors;

public sealed class AzureServiceHealthConnector(
    HttpClient http,
    IConfiguration configuration,
    Func<CancellationToken, Task<string?>>? armTokenProvider = null) : IStatusConnector
{
    public const string PublicFeedUrl = "https://azure.status.microsoft/status/feed/";
    public const string ConnectorIdValue = "azure-service-health";

    public string Id => ConnectorIdValue;
    public string DisplayName => "Azure Service Health";
    public string ComponentId => "azure-status";

    public async Task<ConnectorImportResult> ImportAsync(CancellationToken cancellationToken)
    {
        var events = new List<ConnectorEvent>();
        var status = ComponentStatus.Operational;
        var detail = "Public Azure status RSS is reachable.";

        try
        {
            using var response = await http.GetAsync(PublicFeedUrl, cancellationToken);
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                status = ComponentStatus.MajorOutage;
                detail = $"Azure status RSS returned HTTP {(int)response.StatusCode}.";
            }
            else
            {
                var feedEvents = ParseRss(body);
                events.AddRange(feedEvents);
                if (feedEvents.Count > 0)
                {
                    status = feedEvents.Any(e => e.Status == ComponentStatus.MajorOutage)
                        ? ComponentStatus.MajorOutage
                        : ComponentStatus.PartialOutage;
                    detail = feedEvents[0].Title;
                }
            }
        }
        catch (Exception ex)
        {
            status = ComponentStatus.MajorOutage;
            detail = Trim($"Azure status RSS failed: {ex.Message}");
        }

        var subscription = configuration["Azure:SubscriptionId"] ?? configuration["AZURE_SUBSCRIPTION_ID"];
        if (!string.IsNullOrWhiteSpace(subscription))
        {
            try
            {
                var token = armTokenProvider is null ? null : await armTokenProvider(cancellationToken);
                if (!string.IsNullOrWhiteSpace(token))
                {
                    var armUrl =
                        $"https://management.azure.com/subscriptions/{Uri.EscapeDataString(subscription.Trim())}/providers/Microsoft.ResourceHealth/events?api-version=2022-10-01";
                    using var request = new HttpRequestMessage(HttpMethod.Get, armUrl);
                    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                    using var arm = await http.SendAsync(request, cancellationToken);
                    if (arm.IsSuccessStatusCode)
                    {
                        var armBody = await arm.Content.ReadAsStringAsync(cancellationToken);
                        var armEvents = ParseArmEvents(armBody);
                        events.AddRange(armEvents);
                        if (armEvents.Any(e => e.Status != ComponentStatus.Operational) && status == ComponentStatus.Operational)
                        {
                            status = armEvents.Any(e => e.Status == ComponentStatus.MajorOutage)
                                ? ComponentStatus.MajorOutage
                                : ComponentStatus.PartialOutage;
                            detail = armEvents[0].Title;
                        }
                    }
                }
            }
            catch
            {
                // Public RSS already populated the import. ARM is optional.
            }
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

    internal static List<ConnectorEvent> ParseRss(string xml)
    {
        var events = new List<ConnectorEvent>();
        if (string.IsNullOrWhiteSpace(xml))
        {
            return events;
        }

        XDocument doc;
        try
        {
            doc = XDocument.Parse(xml);
        }
        catch
        {
            return events;
        }

        var items = doc.Descendants().Where(e => e.Name.LocalName is "item" or "entry");
        foreach (var item in items)
        {
            var title = item.Elements().FirstOrDefault(e => e.Name.LocalName == "title")?.Value?.Trim() ?? "Azure advisory";
            var description = item.Elements().FirstOrDefault(e => e.Name.LocalName is "description" or "summary")?.Value?.Trim() ?? title;
            var dateText = item.Elements().FirstOrDefault(e => e.Name.LocalName is "pubDate" or "updated" or "published")?.Value;
            var occurred = DateTimeOffset.TryParse(dateText, out var parsed) ? parsed : DateTimeOffset.UtcNow;
            var guid = item.Elements().FirstOrDefault(e => e.Name.LocalName is "guid" or "id")?.Value ?? title;
            events.Add(new ConnectorEvent(
                guid,
                title,
                Trim(description),
                TitleStatus(title + " " + description),
                occurred));
        }

        return events;
    }

    internal static List<ConnectorEvent> ParseArmEvents(string json)
    {
        var events = new List<ConnectorEvent>();
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (!doc.RootElement.TryGetProperty("value", out var value) || value.ValueKind != JsonValueKind.Array)
            {
                return events;
            }

            foreach (var row in value.EnumerateArray())
            {
                var id = row.TryGetProperty("id", out var idEl) ? idEl.GetString() ?? Guid.NewGuid().ToString("N") : Guid.NewGuid().ToString("N");
                var props = row.TryGetProperty("properties", out var p) ? p : row;
                var title = props.TryGetProperty("title", out var t) ? t.GetString() ?? "Azure Resource Health" : "Azure Resource Health";
                var description = props.TryGetProperty("description", out var d) ? d.GetString() ?? title : title;
                var eventType = props.TryGetProperty("eventType", out var et) ? et.GetString() ?? "" : "";
                events.Add(new ConnectorEvent(id, title, Trim(description), TitleStatus(eventType + " " + title), DateTimeOffset.UtcNow));
            }
        }
        catch (JsonException)
        {
            // ignore optional ARM payload
        }

        return events;
    }

    private static ComponentStatus TitleStatus(string text)
    {
        var lower = text.ToLowerInvariant();
        if (lower.Contains("outage") || lower.Contains("unavailable") || lower.Contains("unhealthy"))
        {
            return ComponentStatus.MajorOutage;
        }

        if (lower.Contains("advisory") || lower.Contains("degraded") || lower.Contains("investigat") || lower.Contains("information"))
        {
            return ComponentStatus.PartialOutage;
        }

        return ComponentStatus.PartialOutage;
    }

    private static string Trim(string value) =>
        value.Length <= 240 ? value : value[..240];
}
