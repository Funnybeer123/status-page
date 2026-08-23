namespace StatusPage.Api;

public static class OperatorAuth
{
    public static async ValueTask<object?> RequireApiKey(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var config = context.HttpContext.RequestServices.GetRequiredService<IConfiguration>();
        var env = context.HttpContext.RequestServices.GetRequiredService<IHostEnvironment>();
        var expected = config["STATUSPAGE_API_KEY"] ?? config["StatusPage:ApiKey"];

        if (string.IsNullOrWhiteSpace(expected))
        {
            if (!env.IsDevelopment())
            {
                return Results.Json(new { error = "Operator API is disabled. Set STATUSPAGE_API_KEY." }, statusCode: 401);
            }

            expected = "dev-key";
        }

        var provided = context.HttpContext.Request.Headers["X-Api-Key"].ToString();
        if (!string.Equals(provided, expected, StringComparison.Ordinal))
        {
            return Results.Json(new { error = "Invalid or missing X-Api-Key header." }, statusCode: 401);
        }

        return await next(context);
    }
}
