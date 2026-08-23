using System.Net.Sockets;
using StatusPage.Domain;

namespace StatusPage.Services;

public sealed class CheckRunner(IHttpClientFactory httpClientFactory, ILogger<CheckRunner> logger)
{
    public async Task<(bool Ok, string Message)> RunAsync(StatusCheck check, CancellationToken cancellationToken)
    {
        if (!CheckTarget.TryParse(check.Target, check.Type.ApiValue(), out var target, out var error))
        {
            return (false, error);
        }

        try
        {
            return target.Type == CheckType.Tcp
                ? await RunTcpAsync(target, check.TimeoutSeconds, cancellationToken)
                : await RunHttpAsync(target, check, cancellationToken);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return (false, $"Timed out after {check.TimeoutSeconds}s");
        }
        catch (Exception ex)
        {
            logger.LogDebug(ex, "Check {CheckId} failed", check.Id);
            return (false, Trim(ex.Message));
        }
    }

    private async Task<(bool Ok, string Message)> RunHttpAsync(
        ResolvedCheckTarget target,
        StatusCheck check,
        CancellationToken cancellationToken)
    {
        var client = httpClientFactory.CreateClient("StatusChecks");
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(check.TimeoutSeconds, 1, 120)));

        using var response = await client.GetAsync(target.Uri, HttpCompletionOption.ResponseContentRead, timeout.Token);
        var code = (int)response.StatusCode;
        var body = await response.Content.ReadAsStringAsync(timeout.Token);
        if (code != check.ExpectedStatus)
        {
            return (false, $"HTTP {code}, expected {check.ExpectedStatus}");
        }

        if (!string.IsNullOrEmpty(check.Keyword) &&
            body.IndexOf(check.Keyword, StringComparison.OrdinalIgnoreCase) < 0)
        {
            return (false, $"Response did not contain keyword '{check.Keyword}'");
        }

        return (true, $"HTTP {code}");
    }

    private static async Task<(bool Ok, string Message)> RunTcpAsync(
        ResolvedCheckTarget target,
        int timeoutSeconds,
        CancellationToken cancellationToken)
    {
        using var client = new TcpClient();
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(timeoutSeconds, 1, 120)));
        await client.ConnectAsync(target.Host, target.Port, timeout.Token);
        return (true, $"TCP connect {target.Host}:{target.Port}");
    }

    private static string Trim(string message) =>
        message.Length <= 240 ? message : message[..240];
}
