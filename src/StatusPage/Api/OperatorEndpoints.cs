using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Api;

public static class OperatorEndpoints
{
    public static void MapOperatorApi(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/operator").AddEndpointFilter(OperatorAuth.RequireStaffReadOrOperatorWrite);

        group.MapGet("/audit", (IAuditLog audit) =>
            Results.Json(audit.Recent().Select(e => new
            {
                at = PublicApiMapper.Iso(e.At),
                actor = e.Actor,
                action = e.Action,
                targetId = e.TargetId
            })));

        group.MapGet("/page", (IStatusStore store) =>
        {
            var page = store.Snapshot().Page;
            return Results.Json(new
            {
                name = page.Name,
                logoUrl = page.LogoUrl,
                timeZone = page.TimeZone,
                updatedAt = PublicApiMapper.Iso(page.UpdatedAt)
            });
        });

        group.MapPatch("/page", (WritePageJson body, IStatusStore store, IAuditLog audit, HttpContext http) =>
        {
            try
            {
                var page = store.UpdatePage(body.Name, body.LogoUrl, body.TimeZone);
                OperatorAuth.Audit(http, audit, "page.branding", page.Id);
                return Results.Json(new { name = page.Name, logoUrl = page.LogoUrl, timeZone = page.TimeZone });
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        group.MapPost("/page/logo", async (HttpRequest request, IStatusStore store, IWebHostEnvironment env, IConfiguration config, IAuditLog audit) =>
        {
            if (!request.HasFormContentType)
            {
                return Results.BadRequest(new { error = "multipart form with file field 'logo' is required." });
            }

            var form = await request.ReadFormAsync();
            var file = form.Files.GetFile("logo");
            if (file is null)
            {
                return Results.BadRequest(new { error = "logo file is required." });
            }

            try
            {
                var dir = config["StatusPage:BrandingPath"]
                          ?? Path.Combine(env.ContentRootPath, "data", "branding");
                var url = BrandingFiles.Save(dir, file);
                var page = store.UpdatePage(null, url);
                OperatorAuth.Audit(request.HttpContext, audit, "page.logo", page.Id);
                return Results.Json(new { name = page.Name, logoUrl = page.LogoUrl, timeZone = page.TimeZone });
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        group.MapGet("/components", (IStatusStore store, HttpContext http) =>
        {
            var state = store.Snapshot();
            var checks = store.ListChecks();
            if (!OperatorAuth.IsOperator(http))
            {
                ComponentVisibility.RemoveInternal(state, checks);
            }

            return Results.Json(state.Components.Select(c => ComponentJson(c, checks)));
        });

        group.MapPost("/components", (WriteComponentJson body, IStatusStore store, IAuditLog audit, HttpContext http) =>
        {
            try
            {
                var created = store.CreateComponent(body.ToRequest());
                OperatorAuth.Audit(http, audit, "component.create", created.Id);
                return Results.Created($"/api/operator/components/{created.Id}", ComponentJson(created, store.ListChecks()));
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        group.MapPut("/components/{id}", (string id, WriteComponentJson body, IStatusStore store, IAuditLog audit, HttpContext http) =>
        {
            try
            {
                var updated = store.UpdateComponentMeta(id, body.ToRequest());
                OperatorAuth.Audit(http, audit, "component.edit", updated.Id);
                return Results.Json(ComponentJson(updated, store.ListChecks()));
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

        group.MapDelete("/components/{id}", (string id, IStatusStore store, IAuditLog audit, HttpContext http) =>
        {
            try
            {
                store.DeleteComponent(id);
                OperatorAuth.Audit(http, audit, "component.delete", id);
                return Results.NoContent();
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

        group.MapPatch("/components/{id}", (string id, UpdateComponentRequest body, IStatusStore store, IAuditLog audit, HttpContext http) =>
        {
            if (!DomainEnums.TryParseComponentStatus(body.Status, out var status))
            {
                return Results.BadRequest(new { error = "Status must be operational, degraded_performance, partial_outage, major_outage, or under_maintenance." });
            }

            try
            {
                var component = store.UpdateComponentStatus(id, status);
                OperatorAuth.Audit(http, audit, "component.status", component.Id);
                return Results.Json(new { id = component.Id, name = component.Name, status = component.Status.ApiValue() });
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(new { error = ex.Message });
            }
        });

        group.MapGet("/webhooks", (IWebhookStore webhooks) =>
            Results.Json(webhooks.List().Select(h => new { id = h.Id, url = h.Url, createdAt = PublicApiMapper.Iso(h.CreatedAt) })));

        group.MapPost("/webhooks", (WriteWebhookJson body, IWebhookStore webhooks, IAuditLog audit, HttpContext http) =>
        {
            try
            {
                var created = webhooks.Add(body.Url ?? "");
                OperatorAuth.Audit(http, audit, "webhook.create", created.Id);
                return Results.Created($"/api/operator/webhooks/{created.Id}", new { id = created.Id, url = created.Url });
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        group.MapDelete("/webhooks/{id}", (string id, IWebhookStore webhooks, IAuditLog audit, HttpContext http) =>
        {
            try
            {
                webhooks.Delete(id);
                OperatorAuth.Audit(http, audit, "webhook.delete", id);
                return Results.NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(new { error = ex.Message });
            }
        });

        group.MapGet("/incidents", (IStatusStore store, HttpContext http) =>
        {
            var state = store.Snapshot();
            if (!OperatorAuth.IsOperator(http))
            {
                ComponentVisibility.RemoveInternal(state, store.ListChecks());
            }

            return Results.Json(state.Incidents.Concat(state.ScheduledMaintenances)
                .OrderByDescending(i => i.UpdatedAt)
                .Select(i => IncidentJson(i)));
        });

        group.MapPost("/incidents", (CreateIncidentJson body, IStatusStore store, IAuditLog audit, HttpContext http) =>
        {
            try
            {
                var maintenance = body.Maintenance == true;
                var created = store.CreateIncident(body.ToRequest(), maintenance);
                OperatorAuth.Audit(http, audit, maintenance ? "maintenance.open" : "incident.open", created.Id);
                return Results.Created($"/api/operator/incidents/{created.Id}", IncidentJson(created));
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        group.MapPost("/incidents/{id}/updates", (string id, UpdateIncidentJson body, IStatusStore store, IAuditLog audit, HttpContext http) =>
        {
            try
            {
                var updated = store.UpdateIncident(id, body.ToRequest());
                var action = updated.Status is IncidentStatus.Resolved or IncidentStatus.Completed
                    ? "incident.resolve"
                    : "incident.update";
                OperatorAuth.Audit(http, audit, action, updated.Id);
                return Results.Json(IncidentJson(updated));
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

        group.MapGet("/incidents/{id}/postmortem", (string id, IStatusStore store, HttpContext http) =>
        {
            var state = store.Snapshot();
            var incident = state.Incidents.Concat(state.ScheduledMaintenances)
                .FirstOrDefault(i => i.Id == id);
            if (incident is null)
            {
                return Results.NotFound(new { error = $"Unknown incident '{id}'." });
            }

            if (!OperatorAuth.IsOperator(http)
                && PostmortemRules.IsInternalOnly(incident, state, store.ListChecks()))
            {
                return Results.NotFound(new { error = $"Unknown incident '{id}'." });
            }

            return Results.Json(PostmortemJson(incident));
        });

        group.MapPut("/incidents/{id}/postmortem", (string id, WritePostmortemJson body, IStatusStore store, IAuditLog audit, HttpContext http) =>
        {
            try
            {
                var updated = store.SavePostmortem(id, body.ToRequest());
                var action = updated.Postmortem?.Published == true
                    ? "incident.postmortem.publish"
                    : "incident.postmortem.save";
                OperatorAuth.Audit(http, audit, action, updated.Id);
                return Results.Json(PostmortemJson(updated));
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

        group.MapGet("/templates", (IIncidentTemplateStore templates) =>
            Results.Json(templates.List().Select(TemplateJson)));

        group.MapGet("/templates/{id}", (string id, IIncidentTemplateStore templates) =>
        {
            var template = templates.Find(id);
            return template is null
                ? Results.NotFound(new { error = $"Unknown incident template '{id}'." })
                : Results.Json(TemplateJson(template));
        });

        group.MapPost("/templates", (WriteTemplateJson body, IIncidentTemplateStore templates, IStatusStore store, IAuditLog audit, HttpContext http) =>
        {
            try
            {
                var created = templates.Create(
                    IncidentTemplateRules.NormalizeTitle(body.Title),
                    IncidentTemplateRules.NormalizeImpact(body.Impact),
                    IncidentTemplateRules.NormalizePublicComponentIds(body.ComponentIds, store));
                OperatorAuth.Audit(http, audit, "template.create", created.Id);
                return Results.Created($"/api/operator/templates/{created.Id}", TemplateJson(created));
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        group.MapPut("/templates/{id}", (string id, WriteTemplateJson body, IIncidentTemplateStore templates, IStatusStore store, IAuditLog audit, HttpContext http) =>
        {
            try
            {
                var updated = templates.Update(
                    id,
                    IncidentTemplateRules.NormalizeTitle(body.Title),
                    IncidentTemplateRules.NormalizeImpact(body.Impact),
                    IncidentTemplateRules.NormalizePublicComponentIds(body.ComponentIds, store));
                OperatorAuth.Audit(http, audit, "template.edit", updated.Id);
                return Results.Json(TemplateJson(updated));
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

        group.MapDelete("/templates/{id}", (string id, IIncidentTemplateStore templates, IAuditLog audit, HttpContext http) =>
        {
            try
            {
                templates.Delete(id);
                OperatorAuth.Audit(http, audit, "template.delete", id);
                return Results.NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(new { error = ex.Message });
            }
        });
    }

    private static object ComponentJson(Component component, IEnumerable<StatusCheck> checks) => new
    {
        id = component.Id,
        name = component.Name,
        description = component.Description,
        status = component.Status.ApiValue(),
        group = component.Group,
        group_id = component.GroupId,
        position = component.Position,
        @internal = !component.Group && ComponentVisibility.IsInternalLeaf(component, checks)
    };

    private static object IncidentJson(Incident incident) => new
    {
        id = incident.Id,
        name = incident.Name,
        status = incident.Status.ApiValue(),
        impact = incident.Impact.ApiValue(),
        componentIds = incident.ComponentIds,
        maintenance = incident.Status.IsActiveMaintenance() || incident.ScheduledFor is not null,
        autoFromChecks = incident.AutoFromChecks,
        scheduledFor = PublicApiMapper.Iso(incident.ScheduledFor),
        scheduledUntil = PublicApiMapper.Iso(incident.ScheduledUntil),
        updatedAt = PublicApiMapper.Iso(incident.UpdatedAt),
        postmortem = incident.Postmortem is null ? null : PostmortemBody(incident.Postmortem)
    };

    private static object PostmortemJson(Incident incident) => new
    {
        id = incident.Id,
        postmortem = incident.Postmortem is null ? null : PostmortemBody(incident.Postmortem)
    };

    private static object PostmortemBody(IncidentPostmortem postmortem) => new
    {
        body = postmortem.Body,
        published = postmortem.Published,
        updatedAt = PublicApiMapper.Iso(postmortem.UpdatedAt),
        publishedAt = PublicApiMapper.Iso(postmortem.PublishedAt)
    };

    private static object TemplateJson(IncidentTemplate template) => new
    {
        id = template.Id,
        title = template.Title,
        impact = template.Impact,
        componentIds = template.ComponentIds,
        updatedAt = PublicApiMapper.Iso(template.UpdatedAt)
    };
}

public sealed class WritePageJson
{
    public string? Name { get; set; }
    public string? LogoUrl { get; set; }
    public string? TimeZone { get; set; }
}

public sealed class WriteComponentJson
{
    public string? Id { get; set; }
    public string? Name { get; set; }
    public string? Description { get; set; }
    public bool Group { get; set; }
    public string? GroupId { get; set; }
    public int? Position { get; set; }

    public WriteComponentRequest ToRequest() => new(Id, Name ?? "", Description, Group, GroupId, Position);
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

public sealed class WritePostmortemJson
{
    public string? Body { get; set; }
    public bool? Published { get; set; }

    public WritePostmortemRequest ToRequest() => new(Body ?? "", Published == true);
}

public sealed class WriteWebhookJson
{
    public string? Url { get; set; }
}

public sealed class WriteTemplateJson
{
    public string? Title { get; set; }
    public string? Impact { get; set; }
    public List<string>? ComponentIds { get; set; }
}
