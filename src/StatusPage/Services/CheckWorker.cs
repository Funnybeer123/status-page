using System.Collections.Concurrent;
using StatusPage.Domain;

namespace StatusPage.Services;

public sealed class CheckWorker(
    IStatusStore store,
    CheckRunner runner,
    ILogger<CheckWorker> logger) : BackgroundService
{
    private readonly ConcurrentDictionary<string, byte> _running = new();

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
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
            .Where(c => c.Enabled)
            .Where(c => c.NextRunAt is null || c.NextRunAt <= now)
            .ToList();

        foreach (var check in due)
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (!_running.TryAdd(check.Id, 0))
            {
                continue;
            }

            try
            {
                logger.LogInformation("Running check {Name} ({Id}) against {Target}", check.Name, check.Id, check.DisplayTarget);
                var result = await runner.RunAsync(check, cancellationToken);
                store.RecordCheckResult(check.Id, result);
                logger.LogInformation(
                    "Check {Id} {Result}: {Detail}",
                    check.Id,
                    result.Status.ApiValue(),
                    result.Error ?? $"HTTP {result.HttpStatus}");
            }
            finally
            {
                _running.TryRemove(check.Id, out _);
            }
        }
    }
}
