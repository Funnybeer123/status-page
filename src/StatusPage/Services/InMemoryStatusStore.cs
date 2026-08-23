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
    StatusCheck UpdateCheck(string id, CreateCheckRequest request);
    void DeleteCheck(string id);
    Incident CreateIncident(CreateIncidentRequest request, bool maintenance);
    Incident UpdateIncident(string id, UpdateIncidentRequest request);
    Component UpdateComponentStatus(string id, ComponentStatus status);
    void RecordCheckResult(string checkId, CheckResult result);
    IReadOnlyList<ComponentCheckStatus> ComponentCheckStatuses();
}

public sealed record ComponentCheckStatus(
    string ComponentId,
    ComponentStatus Status,
    int CheckCount,
    int DownCount,
    DateTimeOffset UpdatedAtUtc);

public sealed class InMemoryStatusStore : IStatusStore
{
    private readonly object _gate = new();
    private readonly StatusPageState _state;
    private readonly Action<IReadOnlyList<StatusCheck>>? _persistChecks;

    public InMemoryStatusStore(StatusPageState state, Action<IReadOnlyList<StatusCheck>>? persistChecks = null)
    {
        _state = state;
        _persistChecks = persistChecks;
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

    public StatusCheck CreateCheck(CreateCheckRequest request)
    {
        var check = BuildCheck(request, NewId());
        lock (_gate)
        {
            var leaf = EnsureLeaf(check.ComponentId, request.ComponentName, request.GroupId);
            check.ComponentName = leaf.Name;
            check.ComponentGroupId = leaf.GroupId;
            _state.Checks.Add(check);
            ApplyCheckRollup(check.ComponentId, DateTimeOffset.UtcNow);
            PersistChecks();
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
            return Clone(next);
        }
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
            return Clone(incident);
        }
    }

    public Incident UpdateIncident(string id, UpdateIncidentRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Body))
        {
            throw new ArgumentException("Update body is required.");
        }

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
            return Clone(incident);
        }
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
            return Clone(component);
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
                throw new ArgumentException("Type must be http, https, or tcp.");
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
                BodyContains = request.Http?.BodyContains
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
            }

            component.AutoIncidentId = null;
        }
    }

    private void PersistChecks()
    {
        _persistChecks?.Invoke(_state.Checks.Select(Clone).ToList());
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
            UpdatedAt = state.Page.UpdatedAt
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
        AutoFromChecks = incident.AutoFromChecks
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
            BodyContains = check.Http.BodyContains
        },
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
