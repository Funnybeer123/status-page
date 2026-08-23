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

    public static string ClientKey(HttpContext http) =>
        http.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    public static IResult RateLimited() =>
        Results.Json(new { error = "Too many reports from this address. Try again later." },
            statusCode: StatusCodes.Status429TooManyRequests);

    private static IResult Create(
        CreateReportJson body,
        IProblemReportStore reports,
        IReportRateLimiter limiter,
        HttpContext http)
    {
        if (!limiter.TryAcquire(ClientKey(http)))
        {
            return RateLimited();
        }

        try
        {
            var created = reports.Create(body.Title, body.Body);
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
}
