using StatusPage.Contracts;
using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Api;

public static class CheckEndpoints
{
    public static void MapCheckApi(this IEndpointRouteBuilder app)
    {
        var checks = app.MapGroup("/api/checks").AddEndpointFilter(OperatorAuth.RequireOperator);
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
        checks.MapPost("/", (CheckWriteJson body, IStatusStore store, IAuditLog audit, HttpContext http) =>
        {
            try
            {
                var created = store.CreateCheck(body.ToRequest());
                OperatorAuth.Audit(http, audit, "check.create", created.Id);
                return Results.Created($"/api/checks/{created.Id}", CheckJson.From(created));
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });
        checks.MapPut("/{id}", (string id, CheckWriteJson body, IStatusStore store, IAuditLog audit, HttpContext http) =>
        {
            try
            {
                var updated = store.UpdateCheck(id, body.ToRequest());
                OperatorAuth.Audit(http, audit, "check.edit", updated.Id);
                return Results.Json(CheckJson.From(updated));
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
        checks.MapPatch("/{id}", (string id, CheckPatchJson body, IStatusStore store, IAuditLog audit, HttpContext http) =>
        {
            try
            {
                var patched = store.PatchCheck(id, body.ToRequest());
                var action = body.Enabled is false ? "check.disable" : body.Enabled is true ? "check.enable" : "check.edit";
                OperatorAuth.Audit(http, audit, action, patched.Id);
                return Results.Json(CheckJson.From(patched));
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
        checks.MapPost("/{id}/run", async (string id, CheckRunJson? body, IStatusStore store, CheckRunner runner, CancellationToken cancellationToken) =>
        {
            var check = store.FindCheck(id);
            if (check is null)
            {
                return Results.NotFound(new { error = $"Unknown check '{id}'." });
            }

            var requested = body?.ToTarget();
            if (CheckTarget.HasTargetFields(requested) && !CheckTarget.SameProbeHost(check.Target, requested!))
            {
                return Results.BadRequest(new { error = "Run uses the stored target only. A new host is not allowed." });
            }

            var result = await runner.RunAsync(check, cancellationToken);
            store.RecordCheckResult(check.Id, result);
            var latest = store.FindCheck(check.Id) ?? check;
            return Results.Json(new
            {
                check = CheckJson.From(latest),
                result = ResultJson.From(latest.LastResult ?? result)
            });
        });
        checks.MapDelete("/{id}", (string id, IStatusStore store, IAuditLog audit, HttpContext http) =>
        {
            try
            {
                store.DeleteCheck(id);
                OperatorAuth.Audit(http, audit, "check.delete", id);
                return Results.NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(new { error = ex.Message });
            }
        });

        app.MapGet("/api/status/components", (IStatusStore store) =>
        {
            var checksList = store.ListChecks();
            return Results.Json(store.ComponentCheckStatuses()
                .Where(s =>
                {
                    var component = store.FindComponent(s.ComponentId);
                    return component is null || !ComponentVisibility.IsInternalLeaf(component, checksList);
                })
                .Select(s => new ComponentCheckStatusDocument
                {
                    ComponentId = s.ComponentId,
                    Status = s.Status.ApiValue(),
                    CheckCount = s.CheckCount,
                    DownCount = s.DownCount,
                    UpdatedAtUtc = s.UpdatedAtUtc
                }));
        });
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
    public TlsCheckDocument? Tls { get; set; }
    public DnsCheckDocument? Dns { get; set; }

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
                BodyContains = Http.BodyContains,
                JsonPath = Http.JsonPath,
                ExpectedJsonValue = Http.ExpectedJsonValue,
                Headers = Http.Headers is { Count: > 0 } headers
                    ? new Dictionary<string, string>(headers, StringComparer.OrdinalIgnoreCase)
                    : new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            },
        ComponentName,
        GroupId,
        Tls is null ? null : new TlsCheckSpec { Days = Tls.Days },
        Dns is null ? null : new DnsCheckSpec { ExpectedAddresses = [.. Dns.ExpectedAddresses] });
}

public sealed class CheckPatchJson
{
    public bool? Enabled { get; set; }
    public string? Name { get; set; }
    public int? IntervalSeconds { get; set; }
    public int? TimeoutSeconds { get; set; }
    public int? FailureThreshold { get; set; }
    public int? SuccessThreshold { get; set; }
    public CheckTargetDocument? Target { get; set; }
    public HttpPatchJson? Http { get; set; }
    public TlsCheckDocument? Tls { get; set; }
    public DnsCheckDocument? Dns { get; set; }

    public PatchCheckRequest ToRequest() => new(
        Enabled,
        Name,
        IntervalSeconds,
        TimeoutSeconds,
        FailureThreshold,
        SuccessThreshold,
        Target is null
            ? null
            : new CheckTargetSpec
            {
                Url = Target.Url,
                Host = Target.Host,
                Port = Target.Port,
                Path = Target.Path
            },
        Http is null
            ? null
            : new HttpPatchSpec(
                Http.Method,
                Http.ExpectedStatus,
                Http.BodyContains,
                Http.BodyContainsSpecified,
                Http.JsonPath,
                Http.JsonPathSpecified,
                Http.ExpectedJsonValue,
                Http.ExpectedJsonValueSpecified),
        Tls is null ? null : new TlsCheckSpec { Days = Tls.Days },
        Dns is null ? null : Dns.ExpectedAddresses);
}

public sealed class HttpPatchJson
{
    public string? Method { get; set; }
    public List<int>? ExpectedStatus { get; set; }
    public string? BodyContains { get; set; }
    public string? JsonPath { get; set; }
    public string? ExpectedJsonValue { get; set; }

    public bool BodyContainsSpecified => BodyContains is not null;
    public bool JsonPathSpecified => JsonPath is not null;
    public bool ExpectedJsonValueSpecified => ExpectedJsonValue is not null;
}

public sealed class CheckRunJson
{
    public CheckTargetDocument? Target { get; set; }

    public CheckTargetSpec? ToTarget() =>
        Target is null
            ? null
            : new CheckTargetSpec
            {
                Url = Target.Url,
                Host = Target.Host,
                Port = Target.Port,
                Path = Target.Path
            };
}

public static class CheckJson
{
    public static object From(StatusCheck check) => new
    {
        id = check.Id,
        name = check.Name,
        componentId = check.ComponentId,
        componentName = check.ComponentName,
        groupId = check.ComponentGroupId,
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
        http = check.Type is CheckType.Tcp or CheckType.Dns or CheckType.TlsExpiry
            ? null
            : new
            {
                method = check.Http.Method,
                expectedStatus = check.Http.ExpectedStatus,
                bodyContains = check.Http.BodyContains,
                jsonPath = check.Http.JsonPath,
                expectedJsonValue = check.Http.ExpectedJsonValue,
                headers = RedactHeaders(check.Http.Headers)
            },
        tls = check.Type == CheckType.TlsExpiry ? new { days = check.Tls.Days } : null,
        dns = check.Type == CheckType.Dns ? new { expectedAddresses = check.Dns.ExpectedAddresses } : null,
        state = check.State.ApiValue(),
        consecutiveFailures = check.ConsecutiveFailures,
        consecutiveSuccesses = check.ConsecutiveSuccesses,
        lastResult = check.LastResult is null ? null : ResultJson.From(check.LastResult)
    };

    private static Dictionary<string, string>? RedactHeaders(Dictionary<string, string> headers)
    {
        if (headers.Count == 0)
        {
            return null;
        }

        return headers.ToDictionary(
            kv => kv.Key,
            kv => IsSensitive(kv.Key) ? "(set)" : kv.Value,
            StringComparer.OrdinalIgnoreCase);
    }

    private static bool IsSensitive(string name) =>
        name.Equals("Authorization", StringComparison.OrdinalIgnoreCase)
        || name.Equals("Proxy-Authorization", StringComparison.OrdinalIgnoreCase)
        || name.Contains("secret", StringComparison.OrdinalIgnoreCase)
        || name.Contains("token", StringComparison.OrdinalIgnoreCase)
        || name.Contains("key", StringComparison.OrdinalIgnoreCase);
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
