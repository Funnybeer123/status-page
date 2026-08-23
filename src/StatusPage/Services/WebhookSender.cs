using System.Net.Http.Json;
using System.Text.Json;
using StatusPage.Api;
using StatusPage.Domain;

namespace StatusPage.Services;

public interface IWebhookSender
{
    void Enqueue(string incidentId, string eventType);
    Task NotifyAsync(string incidentId, string eventType, CancellationToken cancellationToken = default);
}

/// <summary>
/// Best-effort outbound POSTs of the public incident document only.
/// Failures never throw to the caller.
/// </summary>
public sealed class WebhookSender(
    IWebhookStore store,
    IHttpClientFactory httpClientFactory,
    ILogger<WebhookSender> logger,
    IServiceProvider services) : IWebhookSender
{
    public const string HttpClientName = "StatusWebhooks";
    public static readonly TimeSpan Timeout = TimeSpan.FromSeconds(5);

    public void Enqueue(string incidentId, string eventType)
    {
        try
        {
            _ = NotifyAsync(incidentId, eventType);
        }
        catch (Exception ex)
        {
            logger.LogDebug(ex, "Webhook enqueue failed for {IncidentId}", incidentId);
        }
    }

    public async Task NotifyAsync(
        string incidentId,
        string eventType,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var hooks = store.List();
            if (hooks.Count == 0)
            {
                return;
            }

            var statusStore = services.GetRequiredService<IStatusStore>();
            var payload = PublicApiMapper.WebhookPayload(PublicApiMapper.ForPublic(statusStore), incidentId, eventType);
            if (payload is null)
            {
                return;
            }

            foreach (var hook in hooks)
            {
                try
                {
                    using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                    timeout.CancelAfter(Timeout);
                    var client = httpClientFactory.CreateClient(HttpClientName);
                    using var response = await client.PostAsJsonAsync(hook.Url, payload, timeout.Token);
                    logger.LogDebug("Webhook {Id} returned {Status}", hook.Id, (int)response.StatusCode);
                }
                catch (Exception ex)
                {
                    logger.LogDebug(ex, "Webhook {Id} failed", hook.Id);
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogDebug(ex, "Webhook notify failed for {IncidentId}", incidentId);
        }
    }
}
