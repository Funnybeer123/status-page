using System.Diagnostics;
using System.Net.Http.Headers;
using System.Net.Sockets;
using StatusPage.Contracts;
using StatusPage.Domain;

namespace StatusPage.Services;

public sealed class CheckRunner(IHttpClientFactory httpClientFactory, ILogger<CheckRunner> logger)
{
    public async Task<CheckResult> RunAsync(StatusCheck check, CancellationToken cancellationToken)
    {
        var at = DateTimeOffset.UtcNow;
        if (!TryResolve(check, out var target, out var error))
        {
            return Fail(at, 0, error);
        }

        try
        {
            return check.Type == CheckType.Tcp
                ? await RunTcpAsync(target, check.TimeoutSeconds, cancellationToken)
                : await RunHttpAsync(target, check, cancellationToken);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return Fail(DateTimeOffset.UtcNow, check.TimeoutSeconds * 1000, $"Timed out after {check.TimeoutSeconds}s");
        }
        catch (Exception ex)
        {
            logger.LogDebug(ex, "Check {CheckId} failed", check.Id);
            return Fail(DateTimeOffset.UtcNow, 0, Trim(ex.Message));
        }
    }

    public static CheckResult EvaluateHttp(
        int statusCode,
        string body,
        IReadOnlyList<int> expectedStatus,
        string? bodyContains,
        int latencyMs,
        DateTimeOffset checkedAtUtc)
    {
        var expected = expectedStatus.Count == 0 ? CheckContract.DefaultExpectedStatus : expectedStatus;
        if (!expected.Contains(statusCode))
        {
            return Fail(checkedAtUtc, latencyMs, $"HTTP {statusCode}, expected {string.Join(",", expected)}", statusCode);
        }

        if (!string.IsNullOrEmpty(bodyContains) && !body.Contains(bodyContains, StringComparison.Ordinal))
        {
            return Fail(checkedAtUtc, latencyMs, $"Response did not contain '{bodyContains}'", statusCode);
        }

        return new CheckResult
        {
            Status = CheckResultStatus.Ok,
            HttpStatus = statusCode,
            LatencyMs = latencyMs,
            CheckedAtUtc = checkedAtUtc
        };
    }

    public static bool TryResolve(StatusCheck check, out ResolvedCheckTarget target, out string error)
    {
        target = default!;
        error = "";

        if (check.Type is CheckType.Http or CheckType.Https)
        {
            var url = check.Target.Url;
            if (string.IsNullOrWhiteSpace(url) && !string.IsNullOrWhiteSpace(check.Target.Host) && check.Target.Port is > 0)
            {
                var scheme = check.Type == CheckType.Https ? "https" : "http";
                var path = check.Target.Path is { Length: > 0 } p ? (p.StartsWith('/') ? p : "/" + p) : "/";
                url = $"{scheme}://{check.Target.Host}:{check.Target.Port}{path}";
            }

            return CheckTarget.TryParse(url, check.Type.ApiValue(), out target, out error);
        }

        if (!string.IsNullOrWhiteSpace(check.Target.Host) && check.Target.Port is > 0 and <= 65535)
        {
            return CheckTarget.TryParse($"{check.Target.Host}:{check.Target.Port}", "tcp", out target, out error);
        }

        return CheckTarget.TryParse(check.DisplayTarget, "tcp", out target, out error);
    }

    private async Task<CheckResult> RunHttpAsync(
        ResolvedCheckTarget target,
        StatusCheck check,
        CancellationToken cancellationToken)
    {
        var client = httpClientFactory.CreateClient("StatusChecks");
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(check.TimeoutSeconds, 1, 120)));

        var method = new HttpMethod(string.IsNullOrWhiteSpace(check.Http.Method) ? "GET" : check.Http.Method);
        using var request = new HttpRequestMessage(method, target.Uri);
        request.Headers.UserAgent.Add(new ProductInfoHeaderValue("status-page-check", "1.0"));

        var clock = Stopwatch.StartNew();
        using var response = await client.SendAsync(request, HttpCompletionOption.ResponseContentRead, timeout.Token);
        var body = await response.Content.ReadAsStringAsync(timeout.Token);
        clock.Stop();

        return EvaluateHttp(
            (int)response.StatusCode,
            body,
            check.Http.ExpectedStatus,
            check.Http.BodyContains,
            (int)clock.ElapsedMilliseconds,
            DateTimeOffset.UtcNow);
    }

    private static async Task<CheckResult> RunTcpAsync(
        ResolvedCheckTarget target,
        int timeoutSeconds,
        CancellationToken cancellationToken)
    {
        var clock = Stopwatch.StartNew();
        using var client = new TcpClient();
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(timeoutSeconds, 1, 120)));
        await client.ConnectAsync(target.Host, target.Port, timeout.Token);
        client.Close();
        clock.Stop();
        return new CheckResult
        {
            Status = CheckResultStatus.Ok,
            LatencyMs = (int)clock.ElapsedMilliseconds,
            CheckedAtUtc = DateTimeOffset.UtcNow
        };
    }

    private static CheckResult Fail(DateTimeOffset at, int latencyMs, string error, int? httpStatus = null) => new()
    {
        Status = CheckResultStatus.Fail,
        HttpStatus = httpStatus,
        LatencyMs = latencyMs,
        Error = Trim(error),
        CheckedAtUtc = at
    };

    private static string Trim(string message) =>
        message.Length <= 240 ? message : message[..240];
}
