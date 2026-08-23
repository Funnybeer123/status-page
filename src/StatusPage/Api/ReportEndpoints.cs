using StatusPage.Services;

namespace StatusPage.Api;

public static class ReportEndpoints
{
    public const string Path = "/api/reports";

    public static void MapReportApi(this IEndpointRouteBuilder app)
    {
        app.MapPost(Path, Create);
        app.MapMethods(Path, ["GET", "HEAD", "PUT", "PATCH", "DELETE", "OPTIONS"],
            () => Results.StatusCode(StatusCodes.Status405MethodNotAllowed));
    }

    /// <summary>Hashed client key. Raw IP is never returned or stored.</summary>
    public static string ClientKey(HttpContext http) =>
        ProblemReportRules.HashRateLimitKey(http.Connection.RemoteIpAddress?.ToString());

    public static IResult RateLimited() =>
        Results.Json(new { error = "Too many reports. Try again later." },
            statusCode: StatusCodes.Status429TooManyRequests);

    private static IResult Create(
        CreateReportJson body,
        IProblemReportStore reports,
        IReportRateLimiter limiter,
        IStatusStore store,
        HttpContext http)
    {
        var hashedKey = ClientKey(http);
        if (!limiter.TryAcquire(hashedKey))
        {
            return RateLimited();
        }

        try
        {
            var componentIds = IncidentTemplateRules.NormalizePublicComponentIds(
                body.ComponentIds, store, "Report");
            var created = reports.Create(body.Title, body.Body, componentIds, hashedKey);
            return Results.Created($"{Path}/{created.Id}", new
            {
                id = created.Id,
                createdAt = PublicApiMapper.Iso(created.CreatedAt)
            });
        }
        catch (ArgumentException ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
    }
}

public sealed class CreateReportJson
{
    public string? Title { get; set; }
    public string? Body { get; set; }
    public List<string>? ComponentIds { get; set; }
}
