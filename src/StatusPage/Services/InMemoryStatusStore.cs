using StatusPage.Contracts;
using StatusPage.Domain;

namespace StatusPage.Services;

public interface IStatusStore
{
    StatusPageState Snapshot();
    Component? FindComponent(string id);
    StatusCheck? FindCheck(string id);
    IReadOnlyList<StatusCheck> ListChecks();
    StatusCheck CreateCheck(CreateCheckRequest request);
    StatusCheck ImportCheck(string? id, CreateCheckRequest request);
    StatusCheck UpdateCheck(string id, CreateCheckRequest request);
    StatusCheck PatchCheck(string id, PatchCheckRequest request);
    StatusCheck SetCheckEnabled(string id, bool enabled);
    void DeleteCheck(string id);
    Incident CreateIncident(CreateIncidentRequest request, bool maintenance);
    Incident UpdateIncident(string id, UpdateIncidentRequest request);
    Component UpdateComponentStatus(string id, ComponentStatus status);
    Component CreateComponent(WriteComponentRequest request);
    Component UpdateComponentMeta(string id, WriteComponentRequest request);
    void DeleteComponent(string id);
    StatusPageInfo UpdatePage(string? name, string? logoUrl);
    void RecordCheckResult(string checkId, CheckResult result);
    IReadOnlyList<ComponentCheckStatus> ComponentCheckStatuses();
    void ApplyConnectorImport(ConnectorSnapshot snapshot);
    IReadOnlyList<ConnectorSnapshot> ListConnectorSnapshots();
}

public sealed record ComponentCheckStatus(
    string ComponentId,
    ComponentStatus Status,
    int CheckCount,
    int DownCount,
    DateTimeOffset UpdatedAtUtc);

/// <summary>Last read-only connector import. Connectors are not probes.</summary>
public sealed record ConnectorSnapshot(
    string ConnectorId,
    string DisplayName,
    string ComponentId,
    ComponentStatus Status,
    string Detail,
    DateTimeOffset ImportedAtUtc,
    IReadOnlyList<ConnectorMappedEvent> Events);

public sealed record ConnectorMappedEvent(
    string ExternalId,
    string Title,
    string Detail,
    ComponentStatus Status,
    DateTimeOffset OccurredAt);

public sealed class InMemoryStatusStore : IStatusStore
{
    private readonly object _gate = new();
    private readonly StatusPageState _state;
    private readonly Action<IReadOnlyList<StatusCheck>>? _persistChecks;
    private readonly Action<StatusPageState>? _persistPage;
    private readonly ICheckResultStore? _results;
    private readonly IWebhookSender? _webhooks;
    private readonly List<(string Id, string Event)> _pendingWebhooks = [];
    private readonly Dictionary<string, ConnectorSnapshot> _connectorSnapshots = new(StringComparer.Ordinal);

    public InMemoryStatusStore(
        StatusPageState state,
        Action<IReadOnlyList<StatusCheck>>? persistChecks = null,
        Action<StatusPageState>? persistPage = null,
        ICheckResultStore? results = null,
        IWebhookSender? webhooks = null)
    {
        _state = state;
        _persistChecks = persistChecks;
        _persistPage = persistPage;
        _results = results;
        _webhooks = webhooks;
        _results?.Hydrate(_state.Checks);
        EnsureLeavesForChecks();
        RefreshGroupStatuses(DateTimeOffset.UtcNow);
    }

    public StatusPageState Snapshot()
    {
        lock (_gate)
        {
            return Clone(_state);
        }
    }

    public Component? FindComponent(string id)
    {
        lock (_gate)
        {
            return _state.Components.FirstOrDefault(c => c.Id == id);
        }
    }

    public StatusCheck? FindCheck(string id)
    {
        lock (_gate)
        {
            return _state.Checks.FirstOrDefault(c => c.Id == id);
        }
    }

    public IReadOnlyList<StatusCheck> ListChecks()
    {
        lock (_gate)
        {
            return _state.Checks.Select(Clone).ToList();
        }
    }

    public StatusCheck CreateCheck(CreateCheckRequest request) => CreateCheck(request, NewId());

    /// <summary>
    /// Create-if-missing by id, same leaf rules as POST /api/checks.
    /// Existing ids keep their stored host unless the imported host is the same.
    /// </summary>
    public StatusCheck ImportCheck(string? id, CreateCheckRequest request)
    {
        if (!string.IsNullOrWhiteSpace(id))
        {
            var existing = FindCheck(id.Trim());
            if (existing is not null)
            {
                var target = request.Target;
                if (!CheckTarget.HasTargetFields(target) || !CheckTarget.SameProbeHost(existing.Target, target))
                {
                    request = request with
                    {
                        Target = new CheckTargetSpec
                        {
                            Url = existing.Target.Url,
                            Host = existing.Target.Host,
                            Port = existing.Target.Port,
                            Path = existing.Target.Path
                        }
                    };
                }

                return UpdateCheck(existing.Id, request);
            }

            return CreateCheck(request, id.Trim());
        }

        return CreateCheck(request, NewId());
    }

    private StatusCheck CreateCheck(CreateCheckRequest request, string id)
    {
        var check = BuildCheck(request, id);
        lock (_gate)
        {
            if (_state.Checks.Any(c => c.Id == check.Id))
            {
                throw new ArgumentException($"Check '{check.Id}' already exists.");
            }

            var leaf = EnsureLeaf(check.ComponentId, request.ComponentName, request.GroupId);
            check.ComponentName = leaf.Name;
            check.ComponentGroupId = leaf.GroupId;
            _state.Checks.Add(check);
            ApplyCheckRollup(check.ComponentId, DateTimeOffset.UtcNow);
            PersistChecks();
            PersistPage();
            return Clone(check);
        }
    }

    public StatusCheck UpdateCheck(string id, CreateCheckRequest request)
    {
        var next = BuildCheck(request, id);
        lock (_gate)
        {
            var existing = _state.Checks.FirstOrDefault(c => c.Id == id)
                           ?? throw new KeyNotFoundException($"Unknown check '{id}'.");
            var leaf = EnsureLeaf(next.ComponentId, request.ComponentName, request.GroupId);
            next.ComponentName = leaf.Name;
            next.ComponentGroupId = leaf.GroupId;
            var previousComponent = existing.ComponentId;
            next.State = existing.State;
            next.ConsecutiveFailures = existing.ConsecutiveFailures;
            next.ConsecutiveSuccesses = existing.ConsecutiveSuccesses;
            next.Results = existing.Results;
            next.CreatedAt = existing.CreatedAt;
            var index = _state.Checks.IndexOf(existing);
            _state.Checks[index] = next;
            ApplyCheckRollup(previousComponent, DateTimeOffset.UtcNow);
            if (previousComponent != next.ComponentId)
            {
                ApplyCheckRollup(next.ComponentId, DateTimeOffset.UtcNow);
            }

            PersistChecks();
            PersistPage();
            return Clone(next);
        }
    }

    public StatusCheck PatchCheck(string id, PatchCheckRequest request)
    {
        lock (_gate)
        {
            var check = _state.Checks.FirstOrDefault(c => c.Id == id)
                        ?? throw new KeyNotFoundException($"Unknown check '{id}'.");
            if (CheckTarget.HasTargetFields(request.Target)
                && !CheckTarget.SameProbeHost(check.Target, request.Target!))
            {
                throw new ArgumentException("PATCH cannot change the probe host. Use PUT for a full edit.");
            }

            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                check.Name = request.Name.Trim();
            }

            if (request.Enabled is { } enabled)
            {
                check.Enabled = enabled;
            }

            if (request.IntervalSeconds is { } interval)
            {
                check.IntervalSeconds = interval;
            }

            if (request.TimeoutSeconds is { } timeout)
            {
                check.TimeoutSeconds = timeout;
            }

            if (request.FailureThreshold is { } failure)
            {
                check.FailureThreshold = failure;
            }

            if (request.SuccessThreshold is { } success)
            {
                check.SuccessThreshold = success;
            }

            if (request.Http is { } http)
            {
                if (!string.IsNullOrWhiteSpace(http.Method))
                {
                    check.Http.Method = http.Method.Trim();
                }

                if (http.ExpectedStatus is { Count: > 0 } statuses)
                {
                    check.Http.ExpectedStatus = [.. statuses];
                }

                if (http.BodyContainsSpecified)
                {
                    check.Http.BodyContains = string.IsNullOrWhiteSpace(http.BodyContains) ? null : http.BodyContains;
                }

                if (http.JsonPathSpecified)
                {
                    check.Http.JsonPath = string.IsNullOrWhiteSpace(http.JsonPath) ? null : http.JsonPath.Trim();
                }

                if (http.ExpectedJsonValueSpecified)
                {
                    check.Http.ExpectedJsonValue = string.IsNullOrWhiteSpace(http.ExpectedJsonValue)
                        ? null
                        : http.ExpectedJsonValue;
                }
            }

            if (request.Tls is { } tls)
            {
                check.Tls.Days = TlsExpiryEvaluator.NormalizeDays(tls.Days);
            }

            if (request.DnsExpectedAddresses is { } addresses)
            {
                check.Dns.ExpectedAddresses =
                [
                    .. addresses.Where(a => !string.IsNullOrWhiteSpace(a)).Select(a => a.Trim())
                ];
            }

            if (check.IntervalSeconds < CheckContract.MinIntervalSeconds || check.IntervalSeconds > 86_400)
            {
                throw new ArgumentException($"Interval must be between {CheckContract.MinIntervalSeconds} and 86400 seconds.");
            }

            if (check.TimeoutSeconds < 1 || check.TimeoutSeconds >= check.IntervalSeconds)
            {
                throw new ArgumentException("Timeout must be at least 1 second and less than the interval.");
            }

            if (!CheckRunner.TryResolve(check, out _, out var error))
            {
                throw new ArgumentException(error);
            }

            ApplyCheckRollup(check.ComponentId, DateTimeOffset.UtcNow);
            PersistChecks();
            return Clone(check);
        }
    }

    public StatusCheck SetCheckEnabled(string id, bool enabled)
    {
        return PatchCheck(id, new PatchCheckRequest(
            enabled, null, null, null, null, null, null, null, null, null));
    }

    public void DeleteCheck(string id)
    {
        lock (_gate)
        {
            var check = _state.Checks.FirstOrDefault(c => c.Id == id)
                        ?? throw new KeyNotFoundException($"Unknown check '{id}'.");
            _state.Checks.Remove(check);
            ApplyCheckRollup(check.ComponentId, DateTimeOffset.UtcNow);
            PersistChecks();
        }
    }

    public Incident CreateIncident(CreateIncidentRequest request, bool maintenance)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Body))
        {
            throw new ArgumentException("Name and body are required.");
        }

        if (!DomainEnums.TryParseIncidentStatus(request.Status ?? (maintenance ? "scheduled" : "investigating"), out var status))
        {
            throw new ArgumentException("Invalid incident status.");
        }

        if (!DomainEnums.TryParseIncidentImpact(request.Impact ?? (maintenance ? "maintenance" : "minor"), out var impact))
        {
            throw new ArgumentException("Invalid incident impact.");
        }

        Incident created;
        lock (_gate)
        {
            var now = DateTimeOffset.UtcNow;
            var ids = (request.ComponentIds ?? []).Where(id => _state.Components.Any(c => c.Id == id)).Distinct().ToList();
            var incident = new Incident
            {
                Id = NewId(),
                Name = request.Name.Trim(),
                Status = status,
                Impact = impact,
                ComponentIds = ids,
                CreatedAt = now,
                UpdatedAt = now,
                ScheduledFor = request.ScheduledFor,
                ScheduledUntil = request.ScheduledUntil,
                ResolvedAt = status is IncidentStatus.Resolved or IncidentStatus.Completed ? now : null,
                MonitoringAt = status == IncidentStatus.Monitoring ? now : null
            };
            incident.Updates.Add(NewUpdate(incident.Id, status, request.Body.Trim(), now));

            if (maintenance)
            {
                _state.ScheduledMaintenances.Add(incident);
            }
            else
            {
                _state.Incidents.Add(incident);
            }

            RefreshGroupStatuses(now);
            _state.Page.UpdatedAt = now;
            QueueWebhook(incident.Id, "incident.created");
            created = Clone(incident);
        }

        FlushWebhooks();
        return created;
    }

    public Incident UpdateIncident(string id, UpdateIncidentRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Body))
        {
            throw new ArgumentException("Update body is required.");
        }

        Incident updated;
        lock (_gate)
        {
            var incident = _state.Incidents.Concat(_state.ScheduledMaintenances)
                .FirstOrDefault(i => i.Id == id)
                ?? throw new KeyNotFoundException($"Unknown incident '{id}'.");

            if (!string.IsNullOrWhiteSpace(request.Status)
                && !DomainEnums.TryParseIncidentStatus(request.Status, out var status))
            {
                throw new ArgumentException("Invalid incident status.");
            }
            else if (!string.IsNullOrWhiteSpace(request.Status))
            {
                DomainEnums.TryParseIncidentStatus(request.Status, out status);
                incident.Status = status;
                if (status is IncidentStatus.Resolved or IncidentStatus.Completed)
                {
                    incident.ResolvedAt = DateTimeOffset.UtcNow;
                }

                if (status == IncidentStatus.Monitoring)
                {
                    incident.MonitoringAt = DateTimeOffset.UtcNow;
                }
            }

            if (request.ComponentIds is not null)
            {
                incident.ComponentIds = request.ComponentIds
                    .Where(componentId => _state.Components.Any(c => c.Id == componentId))
                    .Distinct()
                    .ToList();
            }

            var now = DateTimeOffset.UtcNow;
            incident.Updates.Insert(0, NewUpdate(incident.Id, incident.Status, request.Body.Trim(), now));
            incident.UpdatedAt = now;

            if (request.ComponentStatuses is not null)
            {
                foreach (var (componentId, rawStatus) in request.ComponentStatuses)
                {
                    if (!DomainEnums.TryParseComponentStatus(rawStatus, out var componentStatus))
                    {
                        throw new ArgumentException($"Invalid component status '{rawStatus}'.");
                    }

                    var component = _state.Components.FirstOrDefault(c => c.Id == componentId)
                                    ?? throw new ArgumentException($"Unknown component '{componentId}'.");
                    if (HasEnabledChecks(component.Id))
                    {
                        continue;
                    }

                    component.ManualStatus = componentStatus;
                    component.Status = componentStatus;
                    component.UpdatedAt = now;
                }
            }
            else if (incident.Status is IncidentStatus.Resolved or IncidentStatus.Completed)
            {
                foreach (var component in _state.Components.Where(c => incident.ComponentIds.Contains(c.Id)))
                {
                    if (incident.AutoFromChecks)
                    {
                        continue;
                    }

                    component.ManualStatus = ComponentStatus.Operational;
                    if (!_state.Checks.Any(c => c.Enabled && c.ComponentId == component.Id))
                    {
                        component.Status = ComponentStatus.Operational;
                        component.UpdatedAt = now;
                    }
                    else
                    {
                        ApplyCheckRollup(component.Id, now);
                    }
                }
            }

            RefreshGroupStatuses(now);
            _state.Page.UpdatedAt = now;
            QueueWebhook(incident.Id, "incident.updated");
            updated = Clone(incident);
        }

        FlushWebhooks();
        return updated;
    }

    public Component UpdateComponentStatus(string id, ComponentStatus status)
    {
        lock (_gate)
        {
            var component = _state.Components.FirstOrDefault(c => c.Id == id)
                            ?? throw new KeyNotFoundException($"Unknown component '{id}'.");
            var now = DateTimeOffset.UtcNow;
            component.ManualStatus = status;
            if (status == ComponentStatus.UnderMaintenance
                || !_state.Checks.Any(c => c.Enabled && c.ComponentId == component.Id))
            {
                component.Status = status;
                component.UpdatedAt = now;
            }
            else
            {
                ApplyCheckRollup(component.Id, now);
            }

            RefreshGroupStatuses(now);
            _state.Page.UpdatedAt = now;
            PersistPage();
            return Clone(component);
        }
    }

    public Component CreateComponent(WriteComponentRequest request)
    {
        var id = RequireSlug(request.Id, "id");
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ArgumentException("Name is required.");
        }

        lock (_gate)
        {
            if (_state.Components.Any(c => c.Id == id))
            {
                throw new ArgumentException($"Component '{id}' already exists.");
            }

            string? groupId = null;
            if (request.Group)
            {
                if (!string.IsNullOrWhiteSpace(request.GroupId))
                {
                    throw new ArgumentException("A group cannot belong to another group.");
                }
            }
            else
            {
                groupId = ResolveGroupId(request.GroupId);
            }

            var now = DateTimeOffset.UtcNow;
            var position = request.Position
                           ?? _state.Components.Select(c => c.Position).DefaultIfEmpty(0).Max() + 1;
            var component = new Component
            {
                Id = id,
                Name = request.Name.Trim(),
                Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
                Group = request.Group,
                GroupId = groupId,
                Position = position,
                Status = ComponentStatus.Operational,
                ManualStatus = ComponentStatus.Operational,
                Showcase = true,
                CreatedAt = now,
                UpdatedAt = now
            };
            _state.Components.Add(component);
            RefreshGroupStatuses(now);
            _state.Page.UpdatedAt = now;
            PersistPage();
            return Clone(component);
        }
    }

    public Component UpdateComponentMeta(string id, WriteComponentRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ArgumentException("Name is required.");
        }

        lock (_gate)
        {
            var component = _state.Components.FirstOrDefault(c => c.Id == id)
                            ?? throw new KeyNotFoundException($"Unknown component '{id}'.");
            if (component.Group && !string.IsNullOrWhiteSpace(request.GroupId))
            {
                throw new ArgumentException("A group cannot belong to another group.");
            }

            if (!component.Group)
            {
                component.GroupId = ResolveGroupId(request.GroupId);
            }

            var now = DateTimeOffset.UtcNow;
            component.Name = request.Name.Trim();
            component.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
            if (request.Position is { } position)
            {
                component.Position = position;
            }

            component.UpdatedAt = now;
            RefreshGroupStatuses(now);
            _state.Page.UpdatedAt = now;
            PersistPage();
            return Clone(component);
        }
    }

    public void DeleteComponent(string id)
    {
        lock (_gate)
        {
            var component = _state.Components.FirstOrDefault(c => c.Id == id)
                            ?? throw new KeyNotFoundException($"Unknown component '{id}'.");
            if (component.Group && _state.Components.Any(c => c.GroupId == component.Id))
            {
                throw new ArgumentException("Delete or move child components before deleting a group.");
            }

            if (!component.Group && _state.Checks.Any(c => c.ComponentId == component.Id))
            {
                throw new ArgumentException("Delete or reassign checks before deleting a component.");
            }

            _state.Components.Remove(component);
            var now = DateTimeOffset.UtcNow;
            RefreshGroupStatuses(now);
            _state.Page.UpdatedAt = now;
            PersistPage();
        }
    }

    public StatusPageInfo UpdatePage(string? name, string? logoUrl)
    {
        lock (_gate)
        {
            if (!string.IsNullOrWhiteSpace(name))
            {
                _state.Page.Name = name.Trim();
            }

            if (logoUrl is not null)
            {
                _state.Page.LogoUrl = string.IsNullOrWhiteSpace(logoUrl) ? null : NormalizeLogoUrl(logoUrl);
            }

            _state.Page.UpdatedAt = DateTimeOffset.UtcNow;
            PersistPage();
            return Clone(_state).Page;
        }
    }

    public void RecordCheckResult(string checkId, CheckResult result)
    {
        lock (_gate)
        {
            var check = _state.Checks.FirstOrDefault(c => c.Id == checkId);
            if (check is null)
            {
                return;
            }

            var ok = result.Status == CheckResultStatus.Ok;
            if (ok)
            {
                check.ConsecutiveSuccesses++;
                check.ConsecutiveFailures = 0;
            }
            else
            {
                check.ConsecutiveFailures++;
                check.ConsecutiveSuccesses = 0;
            }

            check.State = CheckRollup.NextState(
                check.State,
                ok,
                check.ConsecutiveSuccesses,
                check.ConsecutiveFailures,
                check.SuccessThreshold,
                check.FailureThreshold);
            check.Results.Insert(0, result);
            if (check.Results.Count > 20)
            {
                check.Results.RemoveRange(20, check.Results.Count - 20);
            }

            check.NextRunAt = result.CheckedAtUtc.AddSeconds(Math.Max(CheckContract.MinIntervalSeconds, check.IntervalSeconds));
            ApplyCheckRollup(check.ComponentId, result.CheckedAtUtc);
            try
            {
                _results?.Append(check.Id, result);
            }
            catch (Exception)
            {
                // History persist must not fail the probe write.
            }
        }

        FlushWebhooks();
    }

    public void ApplyConnectorImport(ConnectorSnapshot snapshot)
    {
        lock (_gate)
        {
            _connectorSnapshots[snapshot.ConnectorId] = snapshot;
            var component = _state.Components.FirstOrDefault(c => c.Id == snapshot.ComponentId);
            if (component is null || component.Group)
            {
                return;
            }

            var now = snapshot.ImportedAtUtc == default ? DateTimeOffset.UtcNow : snapshot.ImportedAtUtc;
            var existing = _state.Incidents.FirstOrDefault(i =>
                i.ConnectorId == snapshot.ConnectorId
                && i.ComponentIds.Contains(component.Id)
                && i.Status.IsUnresolvedIncident());

            if (snapshot.Status is ComponentStatus.PartialOutage or ComponentStatus.MajorOutage)
            {
                if (existing is null)
                {
                    var incident = new Incident
                    {
                        Id = NewId(),
                        Name = $"{component.Name}: {snapshot.DisplayName}",
                        Status = IncidentStatus.Investigating,
                        Impact = snapshot.Status == ComponentStatus.MajorOutage
                            ? IncidentImpact.Critical
                            : IncidentImpact.Major,
                        ComponentIds = [component.Id],
                        AutoFromChecks = false,
                        ConnectorId = snapshot.ConnectorId,
                        CreatedAt = now,
                        UpdatedAt = now
                    };
                    incident.Updates.Add(NewUpdate(
                        incident.Id,
                        IncidentStatus.Investigating,
                        string.IsNullOrWhiteSpace(snapshot.Detail)
                            ? $"{snapshot.DisplayName} reported {snapshot.Status.ApiValue()}."
                            : snapshot.Detail,
                        now));
                    _state.Incidents.Add(incident);
                    QueueWebhook(incident.Id, "incident.created");
                }
                else
                {
                    existing.UpdatedAt = now;
                    existing.Impact = snapshot.Status == ComponentStatus.MajorOutage
                        ? IncidentImpact.Critical
                        : IncidentImpact.Major;
                    existing.Updates.Insert(0, NewUpdate(
                        existing.Id,
                        IncidentStatus.Investigating,
                        string.IsNullOrWhiteSpace(snapshot.Detail)
                            ? $"{snapshot.DisplayName} still reports {snapshot.Status.ApiValue()}."
                            : snapshot.Detail,
                        now));
                    QueueWebhook(existing.Id, "incident.updated");
                }
            }
            else if (existing is not null && snapshot.Status == ComponentStatus.Operational)
            {
                existing.Status = IncidentStatus.Resolved;
                existing.ResolvedAt = now;
                existing.UpdatedAt = now;
                existing.Updates.Insert(0, NewUpdate(
                    existing.Id,
                    IncidentStatus.Resolved,
                    $"{snapshot.DisplayName} reports recovered.",
                    now));
                QueueWebhook(existing.Id, "incident.updated");
            }

            if (component.ManualStatus == ComponentStatus.UnderMaintenance
                || component.Status == ComponentStatus.UnderMaintenance)
            {
                RefreshGroupStatuses(now);
                _state.Page.UpdatedAt = now;
                return;
            }

            if (!HasEnabledChecks(component.Id))
            {
                component.ManualStatus = snapshot.Status;
                component.Status = snapshot.Status;
                component.UpdatedAt = now;
            }

            RefreshGroupStatuses(now);
            _state.Page.UpdatedAt = now;
        }

        FlushWebhooks();
    }

    public IReadOnlyList<ConnectorSnapshot> ListConnectorSnapshots()
    {
        lock (_gate)
        {
            return _connectorSnapshots.Values.ToList();
        }
    }

    public IReadOnlyList<ComponentCheckStatus> ComponentCheckStatuses()
    {
        lock (_gate)
        {
            return _state.Components
                .Where(c => !c.Group)
                .Select(c =>
                {
                    var checks = _state.Checks.Where(x => x.Enabled && x.ComponentId == c.Id).ToList();
                    return new ComponentCheckStatus(
                        c.Id,
                        c.Status,
                        checks.Count,
                        checks.Count(x => x.State == CheckState.Down),
                        c.UpdatedAt);
                })
                .ToList();
        }
    }

    private bool HasEnabledChecks(string componentId) =>
        _state.Checks.Any(c => c.Enabled && c.ComponentId == componentId);

    private void EnsureLeavesForChecks()
    {
        foreach (var check in _state.Checks)
        {
            if (_state.Components.Any(c => c.Id == check.ComponentId))
            {
                continue;
            }

            if (string.IsNullOrWhiteSpace(check.ComponentName))
            {
                continue;
            }

            EnsureLeaf(check.ComponentId, check.ComponentName, check.ComponentGroupId);
        }
    }

    private Component EnsureLeaf(string componentId, string? componentName, string? groupId)
    {
        var existing = _state.Components.FirstOrDefault(c => c.Id == componentId);
        if (existing is not null)
        {
            if (existing.Group)
            {
                throw new ArgumentException("Checks must map to a leaf component, not a group.");
            }

            return existing;
        }

        if (string.IsNullOrWhiteSpace(componentName))
        {
            throw new ArgumentException("componentName is required when creating a leaf.");
        }

        string? resolvedGroupId = null;
        if (!string.IsNullOrWhiteSpace(groupId))
        {
            var group = _state.Components.FirstOrDefault(c => c.Id == groupId.Trim());
            if (group is null || !group.Group)
            {
                throw new ArgumentException($"Unknown group '{groupId}'.");
            }

            resolvedGroupId = group.Id;
        }

        var now = DateTimeOffset.UtcNow;
        var position = _state.Components.Where(c => !c.Group).Select(c => c.Position).DefaultIfEmpty(0).Max() + 1;
        var leaf = new Component
        {
            Id = componentId,
            Name = componentName.Trim(),
            Status = ComponentStatus.Operational,
            ManualStatus = ComponentStatus.Operational,
            Group = false,
            GroupId = resolvedGroupId,
            Position = position,
            Showcase = true,
            CreatedAt = now,
            UpdatedAt = now
        };
        _state.Components.Add(leaf);
        return leaf;
    }

    private static StatusCheck BuildCheck(CreateCheckRequest request, string id)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ArgumentException("Name is required.");
        }

        if (string.IsNullOrWhiteSpace(request.ComponentId))
        {
            throw new ArgumentException("componentId is required.");
        }

        var componentId = request.ComponentId.Trim();
        if (componentId.Any(c => !(char.IsAsciiLetterOrDigit(c) || c is '-' or '_')))
        {
            throw new ArgumentException("componentId must be a slug (letters, digits, hyphen, or underscore).");
        }

        if (!DomainEnums.TryParseCheckType(request.Type, out var type))
        {
            if (!string.IsNullOrWhiteSpace(request.Target.Url)
                && Uri.TryCreate(request.Target.Url, UriKind.Absolute, out var uri))
            {
                type = uri.Scheme == Uri.UriSchemeHttps ? CheckType.Https : CheckType.Http;
            }
            else if (!string.IsNullOrWhiteSpace(request.Type))
            {
                var raw = request.Type.Trim();
                if (raw.Equals("icmp", StringComparison.OrdinalIgnoreCase)
                    || raw.Equals("ping", StringComparison.OrdinalIgnoreCase)
                    || raw.Equals("connector", StringComparison.OrdinalIgnoreCase))
                {
                    throw new ArgumentException("Type must be http, https, tcp, tls_expiry, or dns. ICMP and connectors are not probes.");
                }

                throw new ArgumentException("Type must be http, https, tcp, tls_expiry, or dns.");
            }
            else
            {
                type = CheckType.Tcp;
            }
        }

        var draft = new StatusCheck
        {
            Id = id,
            Name = request.Name.Trim(),
            ComponentId = componentId,
            ComponentName = string.IsNullOrWhiteSpace(request.ComponentName) ? null : request.ComponentName.Trim(),
            ComponentGroupId = string.IsNullOrWhiteSpace(request.GroupId) ? null : request.GroupId.Trim(),
            Type = type,
            Enabled = request.Enabled ?? true,
            IntervalSeconds = request.IntervalSeconds ?? CheckContract.DefaultIntervalSeconds,
            TimeoutSeconds = request.TimeoutSeconds ?? CheckContract.DefaultTimeoutSeconds,
            FailureThreshold = request.FailureThreshold ?? CheckContract.DefaultFailureThreshold,
            SuccessThreshold = request.SuccessThreshold ?? CheckContract.DefaultSuccessThreshold,
            Target = new CheckTargetSpec
            {
                Url = request.Target.Url,
                Host = request.Target.Host,
                Port = request.Target.Port,
                Path = request.Target.Path
            },
            Http = new HttpCheckSpec
            {
                Method = string.IsNullOrWhiteSpace(request.Http?.Method) ? "GET" : request.Http!.Method,
                ExpectedStatus = request.Http?.ExpectedStatus is { Count: > 0 } statuses
                    ? [.. statuses]
                    : [.. CheckContract.DefaultExpectedStatus],
                BodyContains = request.Http?.BodyContains,
                JsonPath = request.Http?.JsonPath,
                ExpectedJsonValue = request.Http?.ExpectedJsonValue,
                Headers = request.Http?.Headers is { Count: > 0 } headers
                    ? new Dictionary<string, string>(headers, StringComparer.OrdinalIgnoreCase)
                    : new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            },
            Tls = new TlsCheckSpec
            {
                Days = TlsExpiryEvaluator.NormalizeDays(request.Tls?.Days)
            },
            Dns = new DnsCheckSpec
            {
                ExpectedAddresses = request.Dns?.ExpectedAddresses is { Count: > 0 } addresses
                    ? [.. addresses.Where(a => !string.IsNullOrWhiteSpace(a)).Select(a => a.Trim())]
                    : []
            },
            NextRunAt = DateTimeOffset.UtcNow
        };

        if (draft.IntervalSeconds < CheckContract.MinIntervalSeconds || draft.IntervalSeconds > 86_400)
        {
            throw new ArgumentException($"Interval must be between {CheckContract.MinIntervalSeconds} and 86400 seconds.");
        }

        if (draft.TimeoutSeconds < 1 || draft.TimeoutSeconds >= draft.IntervalSeconds)
        {
            throw new ArgumentException("Timeout must be at least 1 second and less than the interval.");
        }

        if (!CheckRunner.TryResolve(draft, out _, out var error))
        {
            throw new ArgumentException(error);
        }

        return draft;
    }

    private void ApplyCheckRollup(string componentId, DateTimeOffset at)
    {
        var component = _state.Components.FirstOrDefault(c => c.Id == componentId);
        if (component is null)
        {
            return;
        }

        if (component.ManualStatus == ComponentStatus.UnderMaintenance
            || component.Status == ComponentStatus.UnderMaintenance && !_state.Checks.Any(c => c.Enabled && c.ComponentId == componentId))
        {
            component.Status = ComponentStatus.UnderMaintenance;
            RefreshGroupStatuses(at);
            _state.Page.UpdatedAt = at;
            return;
        }

        var states = _state.Checks
            .Where(c => c.Enabled && c.ComponentId == componentId)
            .Select(c => c.State)
            .ToList();
        var derived = CheckRollup.FromCheckStates(states);
        var next = derived ?? component.ManualStatus;
        var previous = component.Status;
        if (previous != next)
        {
            component.Status = next;
            component.UpdatedAt = at;
            SyncAutoIncident(component, previous, next, at);
        }

        RefreshGroupStatuses(at);
        _state.Page.UpdatedAt = at;
    }

    private void SyncAutoIncident(Component component, ComponentStatus previous, ComponentStatus next, DateTimeOffset at)
    {
        var leavingOperational = previous == ComponentStatus.Operational
                                 && next is ComponentStatus.PartialOutage or ComponentStatus.MajorOutage;
        var recovered = next == ComponentStatus.Operational
                        && previous is ComponentStatus.PartialOutage or ComponentStatus.MajorOutage;

        if (leavingOperational)
        {
            var existing = _state.Incidents.FirstOrDefault(i =>
                i.AutoFromChecks && i.ComponentIds.Contains(component.Id) && i.Status.IsUnresolvedIncident());
            if (existing is null)
            {
                var incident = new Incident
                {
                    Id = NewId(),
                    Name = $"{component.Name} checks failing",
                    Status = IncidentStatus.Investigating,
                    Impact = next == ComponentStatus.MajorOutage ? IncidentImpact.Critical : IncidentImpact.Major,
                    ComponentIds = [component.Id],
                    AutoFromChecks = true,
                    CreatedAt = at,
                    UpdatedAt = at
                };
                incident.Updates.Add(NewUpdate(
                    incident.Id,
                    IncidentStatus.Investigating,
                    $"Investigating: automated checks report {component.Name} is {next.ApiValue()}.",
                    at));
                _state.Incidents.Add(incident);
                component.AutoIncidentId = incident.Id;
                QueueWebhook(incident.Id, "incident.created");
            }
            else
            {
                existing.UpdatedAt = at;
                existing.Impact = next == ComponentStatus.MajorOutage ? IncidentImpact.Critical : IncidentImpact.Major;
                existing.Updates.Insert(0, NewUpdate(
                    existing.Id,
                    IncidentStatus.Investigating,
                    $"Update: automated checks now report {component.Name} is {next.ApiValue()}.",
                    at));
                component.AutoIncidentId = existing.Id;
                QueueWebhook(existing.Id, "incident.updated");
            }
        }

        if (recovered && component.AutoIncidentId is { } autoId)
        {
            var incident = _state.Incidents.FirstOrDefault(i => i.Id == autoId && i.AutoFromChecks);
            if (incident is not null && incident.Status.IsUnresolvedIncident())
            {
                incident.Status = IncidentStatus.Resolved;
                incident.ResolvedAt = at;
                incident.UpdatedAt = at;
                incident.Updates.Insert(0, NewUpdate(
                    incident.Id,
                    IncidentStatus.Resolved,
                    $"Resolved: all enabled checks for {component.Name} are Up.",
                    at));
                QueueWebhook(incident.Id, "incident.updated");
            }

            component.AutoIncidentId = null;
        }
    }

    private void QueueWebhook(string incidentId, string eventType)
    {
        if (_webhooks is null)
        {
            return;
        }

        _pendingWebhooks.Add((incidentId, eventType));
    }

    private void FlushWebhooks()
    {
        if (_webhooks is null || _pendingWebhooks.Count == 0)
        {
            return;
        }

        var batch = _pendingWebhooks.ToList();
        _pendingWebhooks.Clear();
        foreach (var (id, eventType) in batch)
        {
            try
            {
                _webhooks.Enqueue(id, eventType);
            }
            catch
            {
                // Outbound webhooks are best-effort and must not fail the write.
            }
        }
    }

    private void PersistChecks()
    {
        _persistChecks?.Invoke(_state.Checks.Select(Clone).ToList());
    }

    private void PersistPage()
    {
        _persistPage?.Invoke(Clone(_state));
    }

    private string? ResolveGroupId(string? groupId)
    {
        if (string.IsNullOrWhiteSpace(groupId))
        {
            return null;
        }

        var group = _state.Components.FirstOrDefault(c => c.Id == groupId.Trim());
        if (group is null || !group.Group)
        {
            throw new ArgumentException($"Unknown group '{groupId}'.");
        }

        return group.Id;
    }

    private static string RequireSlug(string? value, string field)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException($"{field} is required.");
        }

        var slug = value.Trim();
        if (slug.Any(c => !(char.IsAsciiLetterOrDigit(c) || c is '-' or '_')))
        {
            throw new ArgumentException($"{field} must be a slug (letters, digits, hyphen, or underscore).");
        }

        return slug;
    }

    internal static string NormalizeLogoUrl(string raw)
    {
        var value = raw.Trim();
        if (value.StartsWith("/branding/", StringComparison.OrdinalIgnoreCase)
            && !value.Contains("..", StringComparison.Ordinal))
        {
            return value;
        }

        if (Uri.TryCreate(value, UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps)
            && !string.IsNullOrWhiteSpace(uri.Host))
        {
            return uri.ToString();
        }

        throw new ArgumentException("Logo must be a local /branding/ path or an http(s) URL.");
    }

    private void RefreshGroupStatuses(DateTimeOffset at)
    {
        foreach (var group in _state.Components.Where(c => c.Group))
        {
            var children = _state.Components.Where(c => c.GroupId == group.Id).Select(c => c.Status).ToList();
            var worst = children.Count == 0 ? ComponentStatus.Operational : StatusRollup.Worst(children);
            if (group.Status != worst)
            {
                group.Status = worst;
                group.UpdatedAt = at;
            }
        }
    }

    private static IncidentUpdate NewUpdate(string incidentId, IncidentStatus status, string body, DateTimeOffset at) =>
        new()
        {
            Id = NewId(),
            IncidentId = incidentId,
            Status = status,
            Body = body,
            CreatedAt = at,
            UpdatedAt = at,
            DisplayAt = at
        };

    private static string NewId() => Guid.NewGuid().ToString("N")[..12];

    private static StatusPageState Clone(StatusPageState state) => new()
    {
        Page = new StatusPageInfo
        {
            Id = state.Page.Id,
            Name = state.Page.Name,
            Url = state.Page.Url,
            TimeZone = state.Page.TimeZone,
            UpdatedAt = state.Page.UpdatedAt,
            LogoUrl = state.Page.LogoUrl
        },
        Components = state.Components.Select(Clone).ToList(),
        Incidents = state.Incidents.Select(Clone).ToList(),
        ScheduledMaintenances = state.ScheduledMaintenances.Select(Clone).ToList(),
        Checks = state.Checks.Select(Clone).ToList()
    };

    private static Component Clone(Component component) => new()
    {
        Id = component.Id,
        Name = component.Name,
        Description = component.Description,
        Status = component.Status,
        Group = component.Group,
        GroupId = component.GroupId,
        Position = component.Position,
        Showcase = component.Showcase,
        OnlyShowIfDegraded = component.OnlyShowIfDegraded,
        CreatedAt = component.CreatedAt,
        UpdatedAt = component.UpdatedAt,
        ManualStatus = component.ManualStatus,
        AutoIncidentId = component.AutoIncidentId
    };

    private static Incident Clone(Incident incident) => new()
    {
        Id = incident.Id,
        Name = incident.Name,
        Status = incident.Status,
        Impact = incident.Impact,
        ComponentIds = [.. incident.ComponentIds],
        Updates = incident.Updates.Select(u => new IncidentUpdate
        {
            Id = u.Id,
            IncidentId = u.IncidentId,
            Status = u.Status,
            Body = u.Body,
            CreatedAt = u.CreatedAt,
            UpdatedAt = u.UpdatedAt,
            DisplayAt = u.DisplayAt
        }).ToList(),
        CreatedAt = incident.CreatedAt,
        UpdatedAt = incident.UpdatedAt,
        MonitoringAt = incident.MonitoringAt,
        ResolvedAt = incident.ResolvedAt,
        ScheduledFor = incident.ScheduledFor,
        ScheduledUntil = incident.ScheduledUntil,
        AutoFromChecks = incident.AutoFromChecks,
        ConnectorId = incident.ConnectorId
    };

    private static StatusCheck Clone(StatusCheck check) => new()
    {
        Id = check.Id,
        Name = check.Name,
        ComponentId = check.ComponentId,
        ComponentName = check.ComponentName,
        ComponentGroupId = check.ComponentGroupId,
        Type = check.Type,
        Enabled = check.Enabled,
        IntervalSeconds = check.IntervalSeconds,
        TimeoutSeconds = check.TimeoutSeconds,
        FailureThreshold = check.FailureThreshold,
        SuccessThreshold = check.SuccessThreshold,
        Target = new CheckTargetSpec
        {
            Url = check.Target.Url,
            Host = check.Target.Host,
            Port = check.Target.Port,
            Path = check.Target.Path
        },
        Http = new HttpCheckSpec
        {
            Method = check.Http.Method,
            ExpectedStatus = [.. check.Http.ExpectedStatus],
            BodyContains = check.Http.BodyContains,
            JsonPath = check.Http.JsonPath,
            ExpectedJsonValue = check.Http.ExpectedJsonValue,
            Headers = new Dictionary<string, string>(check.Http.Headers, StringComparer.OrdinalIgnoreCase)
        },
        Tls = new TlsCheckSpec { Days = check.Tls.Days },
        Dns = new DnsCheckSpec { ExpectedAddresses = [.. check.Dns.ExpectedAddresses] },
        State = check.State,
        ConsecutiveFailures = check.ConsecutiveFailures,
        ConsecutiveSuccesses = check.ConsecutiveSuccesses,
        NextRunAt = check.NextRunAt,
        CreatedAt = check.CreatedAt,
        Results = check.Results.Select(r => new CheckResult
        {
            Status = r.Status,
            HttpStatus = r.HttpStatus,
            LatencyMs = r.LatencyMs,
            Error = r.Error,
            CheckedAtUtc = r.CheckedAtUtc
        }).ToList()
    };
}
