using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Connectors;

public sealed class ConnectorWorker(
    IEnumerable<IStatusConnector> connectors,
    IStatusStore store,
    ILogger<ConnectorWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromSeconds(4), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ImportAllAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Connector import loop failed");
            }

            await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
        }
    }

    public async Task ImportAllAsync(CancellationToken cancellationToken)
    {
        foreach (var connector in connectors)
        {
            cancellationToken.ThrowIfCancellationRequested();
            try
            {
                var imported = await connector.ImportAsync(cancellationToken);
                store.ApplyConnectorImport(imported.ToSnapshot());
                logger.LogInformation(
                    "Connector {Id} mapped {Status} onto {Component}: {Detail}",
                    connector.Id,
                    imported.Status.ApiValue(),
                    imported.ComponentId,
                    imported.Detail);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Connector {Id} import failed", connector.Id);
            }
        }
    }
}
