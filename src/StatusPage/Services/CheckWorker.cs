namespace StatusPage.Services;

public sealed class CheckWorker(
    IStatusStore store,
    CheckRunner runner,
    ILogger<CheckWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Let the web server bind before the self-health check runs.
        await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunDueAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Check worker loop failed");
            }

            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }
    }

    private async Task RunDueAsync(CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var due = store.ListChecks()
            .Where(c => c.NextRunAt is null || c.NextRunAt <= now)
            .ToList();

        foreach (var check in due)
        {
            cancellationToken.ThrowIfCancellationRequested();
            logger.LogInformation("Running check {Name} ({Id}) against {Target}", check.Name, check.Id, check.Target);
            var (ok, message) = await runner.RunAsync(check, cancellationToken);
            store.RecordCheckResult(check.Id, ok, message, DateTimeOffset.UtcNow);
            logger.LogInformation("Check {Id} {Result}: {Message}", check.Id, ok ? "ok" : "fail", message);
        }
    }
}
