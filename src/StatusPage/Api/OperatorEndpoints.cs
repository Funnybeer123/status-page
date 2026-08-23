using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Api;

public static class OperatorEndpoints
{
    public static void MapOperatorApi(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/operator").AddEndpointFilter(OperatorAuth.RequireOperator);

        group.MapGet("/components", (IStatusStore store) =>
        {
            var state = store.Snapshot();
            var checks = store.ListChecks();
            return Results.Json(state.Components.Select(c => new
            {
                id = c.Id,
                name = c.Name,
                status = c.Status.ApiValue(),
                group = c.Group,
                group_id = c.GroupId,
                @internal = !c.Group && ComponentVisibility.IsInternalLeaf(c, checks)
            }));
        });

        group.MapPatch("/components/{id}", (string id, UpdateComponentRequest body, IStatusStore store) =>
        {
            if (!DomainEnums.TryParseComponentStatus(body.Status, out var status))
            {
                return Results.BadRequest(new { error = "Status must be operational, degraded_performance, partial_outage, major_outage, or under_maintenance." });
            }

            try
            {
                var component = store.UpdateComponentStatus(id, status);
                return Results.Json(new { id = component.Id, name = component.Name, status = component.Status.ApiValue() });
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(new { error = ex.Message });
            }
        });

        group.MapPost("/incidents", (CreateIncidentJson body, IStatusStore store) =>
        {
            try
            {
                var created = store.CreateIncident(body.ToRequest(), body.Maintenance == true);
                return Results.Created($"/api/operator/incidents/{created.Id}", new { id = created.Id, status = created.Status.ApiValue() });
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        group.MapPost("/incidents/{id}/updates", (string id, UpdateIncidentJson body, IStatusStore store) =>
        {
            try
            {
                var updated = store.UpdateIncident(id, body.ToRequest());
                return Results.Json(new { id = updated.Id, status = updated.Status.ApiValue(), updated_at = PublicApiMapper.Iso(updated.UpdatedAt) });
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(new { error = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });
    }

}

public sealed class CreateIncidentJson
{
    public string? Name { get; set; }
    public string? Status { get; set; }
    public string? Impact { get; set; }
    public string? Body { get; set; }
    public bool? Maintenance { get; set; }
    public List<string>? ComponentIds { get; set; }
    public DateTimeOffset? ScheduledFor { get; set; }
    public DateTimeOffset? ScheduledUntil { get; set; }

    public CreateIncidentRequest ToRequest() => new(
        Name ?? "",
        Status,
        Impact,
        Body ?? "",
        ComponentIds,
        ScheduledFor,
        ScheduledUntil);
}

public sealed class UpdateIncidentJson
{
    public string? Status { get; set; }
    public string? Body { get; set; }
    public List<string>? ComponentIds { get; set; }
    public Dictionary<string, string>? ComponentStatuses { get; set; }

    public UpdateIncidentRequest ToRequest() => new(Status, Body ?? "", ComponentIds, ComponentStatuses);
}
