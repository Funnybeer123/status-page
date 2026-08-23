using Microsoft.AspNetCore.Http;
using StatusPage.Contracts;
using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Api;

public static class CheckEndpoints
{
    public static void MapCheckApi(this IEndpointRouteBuilder app)
    {
        var checks = app.MapGroup("/api/checks").AddEndpointFilter(OperatorAuth.RequireStaffReadOrOperatorWrite);
        checks.MapGet("/export", (IStatusStore store, HttpContext http) =>
        {
            var listed = CheckVisibility.Visible(store.ListChecks(), http);
            return Results.Json(new
            {
                checks = listed.Select(check => CheckJson.Export(check, CheckVisibility.IncludeHeaders(http)))
            });
        });
        checks.MapPost("/import", (CheckImportJson body, IStatusStore store, IAuditLog audit, HttpContext http) =>
        {
            try
            {
                var imported = new List<object>();
                foreach (var item in body.Checks ?? [])
                {
                    var existing = string.IsNullOrWhiteSpace(item.Id) ? null : store.FindCheck(item.Id);
                    var created = store.ImportCheck(item.Id, item.ToImportRequest(existing));
                    OperatorAuth.Audit(http, audit, existing is null ? "check.create" : "check.edit", created.Id);
                    imported.Add(CheckJson.From(created));
                }

                return Results.Json(new { imported = imported.Count, checks = imported });
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });
        checks.MapGet("/", (IStatusStore store, HttpContext http) =>
            Results.Json(CheckVisibility.Visible(store.ListChecks(), http)
                .Select(check => CheckJson.From(check, CheckVisibility.IncludeHeaders(http)))));
        checks.MapGet("/{id}", (string id, IStatusStore store, HttpContext http) =>
        {
            var check = CheckVisibility.FindVisible(store, id, http);
            return check is null
                ? Results.NotFound(new { error = $"Unknown check '{id}'." })
                : Results.Json(CheckJson.From(check, CheckVisibility.IncludeHeaders(http)));
        });
        checks.MapGet("/{id}/results", (string id, IStatusStore store, HttpContext http) =>
        {
            var check = CheckVisibility.FindVisible(store, id, http);
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

            var now = DateTimeOffset.UtcNow;
            if (CheckMute.IsActive(check, now))
            {
                return Results.Json(new
                {
                    error = "Check is muted.",
                    muted = true,
                    mutedFrom = PublicApiMapper.Iso(check.MutedFrom),
                    mutedUntil = PublicApiMapper.Iso(check.MutedUntil)
                }, statusCode: StatusCodes.Status409Conflict);
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
            var publicIds = PublicApiMapper.ForPublic(store).Components
                .Where(c => !c.Group)
                .Select(c => c.Id)
                .ToHashSet(StringComparer.Ordinal);
            return Results.Json(store.ComponentCheckStatuses()
                .Where(s => publicIds.Contains(s.ComponentId))
                .Select(s => new ComponentCheckStatusDocument
                {
                    ComponentId = s.ComponentId,
                    Status = s.Status.ApiValue(),
                    CheckCount = s.CheckCount,
                    DownCount = s.DownCount,
                    UpdatedAtUtc = s.UpdatedAtUtc
                }));
        });

        app.MapGet("/api/status/uptime", (IStatusStore store, ICheckResultStore results) =>
        {
            var state = PublicApiMapper.ForPublic(store);
            var leaves = PublicUptime.ForPublicLeaves(state, store.ListChecks(), results.List(), DateTimeOffset.UtcNow);
            return Results.Json(new PublicUptimeDocument
            {
                WindowDays = CheckResultStore.PublicBarDays,
                Components = leaves.Select(leaf => new LeafUptimeDocument
                {
                    Id = leaf.Id,
                    Name = leaf.Name,
                    Ok = leaf.Ok,
                    Fail = leaf.Fail,
                    UptimePercent = leaf.UptimePercent,
                    Days = leaf.Days.Select(day => new DayUptimeDocument
                    {
                        Date = day.Date.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture),
                        Ok = day.Ok,
                        Fail = day.Fail
                    }).ToList()
                }).ToList()
            });
        });
    }
}

public sealed class CheckWriteJson
{
    public string? Id { get; set; }
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

    public CreateCheckRequest ToImportRequest(StatusCheck? existing)
    {
        var request = ToRequest();
        var headers = SecretHeaders.MergeImport(Http?.Headers, existing?.Http.Headers);
        if (request.Http is null && headers.Count == 0)
        {
            return request;
        }

        var http = request.Http ?? new HttpCheckSpec();
        http.Headers = headers;
        return request with { Http = http };
    }
}

public sealed class CheckImportJson
{
    public List<CheckWriteJson>? Checks { get; set; }
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
    public DateTimeOffset? MutedFrom
    {
        get => _mutedFrom;
        set
        {
            _mutedFrom = value;
            MutedFromSpecified = true;
        }
    }
    public DateTimeOffset? MutedUntil
    {
        get => _mutedUntil;
        set
        {
            _mutedUntil = value;
            MutedUntilSpecified = true;
        }
    }

    private DateTimeOffset? _mutedFrom;
    private DateTimeOffset? _mutedUntil;
    public bool MutedFromSpecified { get; private set; }
    public bool MutedUntilSpecified { get; private set; }

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
        Dns is null ? null : Dns.ExpectedAddresses,
        MutedFrom,
        MutedFromSpecified,
        MutedUntil,
        MutedUntilSpecified);
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
    public static object From(StatusCheck check, bool includeHeaders = true) => new
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
                headers = includeHeaders ? SecretHeaders.RedactValues(check.Http.Headers) : null
            },
        tls = check.Type == CheckType.TlsExpiry ? new { days = check.Tls.Days } : null,
        dns = check.Type == CheckType.Dns ? new { expectedAddresses = check.Dns.ExpectedAddresses } : null,
        state = check.State.ApiValue(),
        consecutiveFailures = check.ConsecutiveFailures,
        consecutiveSuccesses = check.ConsecutiveSuccesses,
        mutedFrom = PublicApiMapper.Iso(check.MutedFrom),
        mutedUntil = PublicApiMapper.Iso(check.MutedUntil),
        muted = check.IsMuted(DateTimeOffset.UtcNow),
        lastResult = check.LastResult is null ? null : ResultJson.From(check.LastResult)
    };

    public static object Export(StatusCheck check, bool includeHeaders) => new
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
                headers = includeHeaders ? SecretHeaders.RedactValues(check.Http.Headers) : null
            },
        tls = check.Type == CheckType.TlsExpiry ? new { days = check.Tls.Days } : null,
        dns = check.Type == CheckType.Dns ? new { expectedAddresses = check.Dns.ExpectedAddresses } : null,
        mutedFrom = PublicApiMapper.Iso(check.MutedFrom),
        mutedUntil = PublicApiMapper.Iso(check.MutedUntil)
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
