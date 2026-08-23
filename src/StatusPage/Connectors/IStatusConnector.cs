using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Connectors;

/// <summary>
/// Read-only vendor import. Not a probe and not a check type.
/// Maps vendor events onto existing components.
/// </summary>
public interface IStatusConnector
{
    string Id { get; }
    string DisplayName { get; }
    string ComponentId { get; }
    Task<ConnectorImportResult> ImportAsync(CancellationToken cancellationToken);
}

public sealed class ConnectorImportResult
{
    public required string ConnectorId { get; init; }
    public required string DisplayName { get; init; }
    public required string ComponentId { get; init; }
    public ComponentStatus Status { get; init; } = ComponentStatus.Operational;
    public string Detail { get; init; } = "";
    public DateTimeOffset ImportedAtUtc { get; init; } = DateTimeOffset.UtcNow;
    public IReadOnlyList<ConnectorEvent> Events { get; init; } = [];

    public bool Healthy => Status == ComponentStatus.Operational;

    public ConnectorSnapshot ToSnapshot() => new(
        ConnectorId,
        DisplayName,
        ComponentId,
        Status,
        Detail,
        ImportedAtUtc,
        Events.Select(e => new ConnectorMappedEvent(e.ExternalId, e.Title, e.Detail, e.Status, e.OccurredAt)).ToList());
}

public sealed record ConnectorEvent(
    string ExternalId,
    string Title,
    string Detail,
    ComponentStatus Status,
    DateTimeOffset OccurredAt);
