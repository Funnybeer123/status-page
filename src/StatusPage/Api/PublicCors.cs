using System.Text.Json;

namespace StatusPage.Api;

/// <summary>
/// CORS for anonymous public GET only. Writes stay same-origin.
/// <c>/api/checks*</c> never receives CORS headers.
/// </summary>
public sealed class PublicCorsOptions
{
    public const string ConfigKey = "StatusPage:CorsAllowedOrigins";
    public const string PathKey = "StatusPage:CorsPath";

    public PublicCorsOptions(IReadOnlyList<string> allowedOrigins)
    {
        AllowedOrigins = [.. allowedOrigins
            .Where(static origin => !string.IsNullOrWhiteSpace(origin))
            .Select(static origin => origin.Trim().TrimEnd('/'))];
    }

    public IReadOnlyList<string> AllowedOrigins { get; }

    public bool AllowAny =>
        AllowedOrigins.Count == 0
        || AllowedOrigins.Any(static origin => origin == "*");

    public bool Allows(string? origin)
    {
        if (AllowAny)
        {
            return true;
        }

        if (string.IsNullOrWhiteSpace(origin))
        {
            return false;
        }

        var requested = Normalize(origin);
        return AllowedOrigins.Any(allowed =>
            string.Equals(Normalize(allowed), requested, StringComparison.OrdinalIgnoreCase));
    }

    public string AllowOriginValue(string? origin) => AllowAny ? "*" : origin ?? "";

    public static PublicCorsOptions Load(IConfiguration config, string? corsPath)
    {
        var fromConfig = ReadConfigOrigins(config);
        if (fromConfig.Count > 0)
        {
            return new PublicCorsOptions(fromConfig);
        }

        if (!string.IsNullOrWhiteSpace(corsPath) && File.Exists(corsPath))
        {
            return new PublicCorsOptions(ReadFileOrigins(corsPath));
        }

        return new PublicCorsOptions([]);
    }

    private static List<string> ReadConfigOrigins(IConfiguration config)
    {
        var children = config.GetSection(ConfigKey).GetChildren().ToList();
        if (children.Count > 0)
        {
            return children
                .Select(child => child.Value)
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Select(value => value!)
                .ToList();
        }

        var raw = config[ConfigKey];
        if (string.IsNullOrWhiteSpace(raw))
        {
            return [];
        }

        return raw.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).ToList();
    }

    private static List<string> ReadFileOrigins(string path)
    {
        try
        {
            using var doc = JsonDocument.Parse(File.ReadAllText(path));
            if (!doc.RootElement.TryGetProperty("allowedOrigins", out var list)
                || list.ValueKind != JsonValueKind.Array)
            {
                return [];
            }

            return list.EnumerateArray()
                .Where(item => item.ValueKind == JsonValueKind.String)
                .Select(item => item.GetString())
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Select(value => value!)
                .ToList();
        }
        catch (Exception ex) when (ex is IOException or JsonException)
        {
            Console.Error.WriteLine($"Could not read CORS allow-list {path}: {ex.Message}");
            return [];
        }
    }

    private static string Normalize(string origin) => origin.Trim().TrimEnd('/');
}

public static class PublicCors
{
    public static bool IsCheckApi(PathString path)
    {
        var value = path.Value ?? "";
        return value.StartsWith("/api/checks", StringComparison.OrdinalIgnoreCase);
    }

    public static bool IsAnonymousGetPath(PathString path)
    {
        if (IsCheckApi(path))
        {
            return false;
        }

        var value = path.Value ?? "";
        return value.StartsWith("/api/v2/", StringComparison.OrdinalIgnoreCase)
               || value.Equals("/api/status/uptime", StringComparison.OrdinalIgnoreCase)
               || value.Equals("/api/status/components", StringComparison.OrdinalIgnoreCase)
               || value.Equals("/embed", StringComparison.OrdinalIgnoreCase)
               || value.Equals("/incidents.rss", StringComparison.OrdinalIgnoreCase)
               || value.Equals("/incidents.atom", StringComparison.OrdinalIgnoreCase)
               || value.Equals("/maintenance.ics", StringComparison.OrdinalIgnoreCase);
    }

    public static bool IsWriteMethod(string method) =>
        HttpMethods.IsPost(method)
        || HttpMethods.IsPut(method)
        || HttpMethods.IsPatch(method)
        || HttpMethods.IsDelete(method);

    public static bool ShouldApply(HttpRequest request)
    {
        if (IsCheckApi(request.Path) || IsWriteMethod(request.Method))
        {
            return false;
        }

        if (!HttpMethods.IsGet(request.Method)
            && !HttpMethods.IsHead(request.Method)
            && !HttpMethods.IsOptions(request.Method))
        {
            return false;
        }

        return IsAnonymousGetPath(request.Path);
    }
}

public sealed class PublicCorsMiddleware(RequestDelegate next)
{
    public async Task Invoke(HttpContext context, PublicCorsOptions options)
    {
        if (!PublicCors.ShouldApply(context.Request))
        {
            await next(context);
            return;
        }

        var origin = context.Request.Headers.Origin.ToString();
        var allowed = options.Allows(origin);

        if (HttpMethods.IsOptions(context.Request.Method))
        {
            if (!allowed)
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return;
            }

            WriteHeaders(context.Response, options, origin);
            context.Response.StatusCode = StatusCodes.Status204NoContent;
            return;
        }

        if (allowed)
        {
            context.Response.OnStarting(() =>
            {
                WriteHeaders(context.Response, options, origin);
                return Task.CompletedTask;
            });
        }

        await next(context);
    }

    private static void WriteHeaders(HttpResponse response, PublicCorsOptions options, string origin)
    {
        response.Headers.AccessControlAllowOrigin = options.AllowOriginValue(origin);
        response.Headers.AccessControlAllowMethods = "GET, HEAD, OPTIONS";
        response.Headers.AccessControlAllowHeaders = "Accept, Content-Type";
        if (!options.AllowAny)
        {
            response.Headers.Append("Vary", "Origin");
        }
    }
}
