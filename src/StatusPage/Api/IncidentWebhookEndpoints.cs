using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Api;

public static class IncidentWebhookEndpoints
{
    public static void MapIncidentWebhookApi(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/hooks").AddEndpointFilter(IncidentWebhook.Guard);
        group.MapPost("/incidents", HandlePost);
        group.MapMethods("/incidents", ["GET", "HEAD", "PUT", "PATCH", "DELETE", "OPTIONS"],
            () => Results.StatusCode(StatusCodes.Status405MethodNotAllowed));
    }

    /// <summary>
    /// Receive-only POST. Does not take <see cref="IHttpClientFactory"/> and
    /// never fetches Url / callback fields from the caller body.
    /// </summary>
    private static IResult HandlePost(
        InboundIncidentJson body,
        IStatusStore store,
        IAuditLog audit)
    {
        try
        {
            var componentIds = IncidentWebhook.RequirePublicComponentIds(body.ComponentIds, store);
            if (body.ComponentStatuses is { Count: > 0 } statuses)
            {
                IncidentWebhook.RequirePublicComponentIds(statuses.Keys, store);
            }

            Incident incident;
            bool created;
            if (!string.IsNullOrWhiteSpace(body.Id))
            {
                var state = store.Snapshot();
                var existing = state.Incidents.Concat(state.ScheduledMaintenances)
                                   .FirstOrDefault(i => i.Id == body.Id.Trim())
                               ?? throw new KeyNotFoundException($"Unknown incident '{body.Id}'.");
                IncidentWebhook.RequirePublicIncident(existing, store);
                incident = store.UpdateIncident(existing.Id, new UpdateIncidentRequest(
                    body.Status,
                    body.Body ?? "",
                    body.ComponentIds is null ? null : componentIds,
                    body.ComponentStatuses));
                created = false;
            }
            else
            {
                incident = store.CreateIncident(new CreateIncidentRequest(
                    body.Name ?? "",
                    body.Status,
                    body.Impact,
                    body.Body ?? "",
                    componentIds,
                    null,
                    null,
                    body.ComponentStatuses), false);
                created = true;
            }

            audit.Append(IncidentWebhook.Actor, IncidentWebhook.AuditAction(incident, created), incident.Id);
            var payload = new
            {
                id = incident.Id,
                name = incident.Name,
                status = incident.Status.ApiValue(),
                impact = incident.Impact.ApiValue(),
                componentIds = incident.ComponentIds,
                updatedAt = PublicApiMapper.Iso(incident.UpdatedAt)
            };
            return created
                ? Results.Created($"{IncidentWebhook.Path}/{incident.Id}", payload)
                : Results.Json(payload);
        }
        catch (KeyNotFoundException ex)
        {
            return Results.NotFound(new { error = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
    }
}

public sealed class InboundIncidentJson
{
    public string? Id { get; set; }
    public string? Name { get; set; }
    public string? Status { get; set; }
    public string? Impact { get; set; }
    public string? Body { get; set; }
    public List<string>? ComponentIds { get; set; }
    public Dictionary<string, string>? ComponentStatuses { get; set; }
}
