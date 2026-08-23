using StatusPage.Contracts;
using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Api;

public static class CheckEndpoints
{
    public static void MapCheckApi(this IEndpointRouteBuilder app)
    {
        var checks = app.MapGroup("/api/checks").AddEndpointFilter(OperatorAuth.RequireApiKey);
        checks.MapGet("/", (IStatusStore store) => Results.Json(store.ListChecks().Select(CheckJson.From)));
        checks.MapGet("/{id}", (string id, IStatusStore store) =>
        {
            var check = store.FindCheck(id);
            return check is null ? Results.NotFound(new { error = $"Unknown check '{id}'." }) : Results.Json(CheckJson.From(check));
        });
        checks.MapGet("/{id}/results", (string id, IStatusStore store) =>
        {
            var check = store.FindCheck(id);
            if (check is null)
            {
                return Results.NotFound(new { error = $"Unknown check '{id}'." });
            }

            return Results.Json(new
            {
                latest = check.LastResult is null ? null : ResultJson.From(check.LastResult),
                recent = check.Results.Select(ResultJson.From)
            });
        });
        checks.MapPost("/", (CheckWriteJson body, IStatusStore store) =>
        {
            try
            {
                var created = store.CreateCheck(body.ToRequest());
                return Results.Created($"/api/checks/{created.Id}", CheckJson.From(created));
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });
        checks.MapPut("/{id}", (string id, CheckWriteJson body, IStatusStore store) =>
        {
            try
            {
                return Results.Json(CheckJson.From(store.UpdateCheck(id, body.ToRequest())));
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
        checks.MapDelete("/{id}", (string id, IStatusStore store) =>
        {
            try
            {
                store.DeleteCheck(id);
                return Results.NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(new { error = ex.Message });
            }
        });

        app.MapGet("/api/status/components", (IStatusStore store) =>
            Results.Json(store.ComponentCheckStatuses().Select(s => new ComponentCheckStatusDocument
            {
                ComponentId = s.ComponentId,
                Status = s.Status.ApiValue(),
                CheckCount = s.CheckCount,
                DownCount = s.DownCount,
                UpdatedAtUtc = s.UpdatedAtUtc
            })));
    }
}

public sealed class CheckWriteJson
{
    public string? Name { get; set; }
    public string? ComponentId { get; set; }
    public string? ComponentName { get; set; }
    public string? GroupId { get; set; }
    public string? Type { get; set; }
    public bool? Enabled { get; set; }
    public int? IntervalSeconds { get; set; }
    public int? TimeoutSeconds { get; set; }
    public int? FailureThreshold { get; set; }
    public int? SuccessThreshold { get; set; }
    public CheckTargetDocument Target { get; set; } = new();
    public HttpCheckDocument? Http { get; set; }

    public CreateCheckRequest ToRequest() => new(
        Name ?? "",
        ComponentId ?? "",
        Type,
        Enabled,
        IntervalSeconds,
        TimeoutSeconds,
        FailureThreshold,
        SuccessThreshold,
        new CheckTargetSpec
        {
            Url = Target.Url,
            Host = Target.Host,
            Port = Target.Port,
            Path = Target.Path
        },
        Http is null
            ? null
            : new HttpCheckSpec
            {
                Method = Http.Method,
                ExpectedStatus = [.. Http.ExpectedStatus],
                BodyContains = Http.BodyContains
            },
        ComponentName,
        GroupId);
}

public static class CheckJson
{
    public static object From(StatusCheck check) => new
    {
        id = check.Id,
        name = check.Name,
        componentId = check.ComponentId,
        type = check.Type.ApiValue(),
        enabled = check.Enabled,
        intervalSeconds = check.IntervalSeconds,
        timeoutSeconds = check.TimeoutSeconds,
        failureThreshold = check.FailureThreshold,
        successThreshold = check.SuccessThreshold,
        target = new
        {
            url = check.Target.Url,
            host = check.Target.Host,
            port = check.Target.Port,
            path = check.Target.Path
        },
        http = check.Type == CheckType.Tcp
            ? null
            : new
            {
                method = check.Http.Method,
                expectedStatus = check.Http.ExpectedStatus,
                bodyContains = check.Http.BodyContains
            },
        state = check.State.ApiValue(),
        lastResult = check.LastResult is null ? null : ResultJson.From(check.LastResult)
    };
}

public static class ResultJson
{
    public static object From(CheckResult result) => new
    {
        status = result.Status.ApiValue(),
        httpStatus = result.HttpStatus,
        latencyMs = result.LatencyMs,
        error = result.Error,
        checkedAtUtc = result.CheckedAtUtc
    };
}
