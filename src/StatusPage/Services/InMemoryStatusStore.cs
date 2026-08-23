using StatusPage.Domain;

namespace StatusPage.Services;

public interface IStatusStore
{
    StatusPageState Snapshot();
    Component? FindComponent(string id);
    StatusCheck? FindCheck(string id);
    IReadOnlyList<StatusCheck> ListChecks();
    StatusCheck CreateCheck(CreateCheckRequest request);
    Incident CreateIncident(CreateIncidentRequest request, bool maintenance);
    Incident UpdateIncident(string id, UpdateIncidentRequest request);
    Component UpdateComponentStatus(string id, ComponentStatus status);
    void RecordCheckResult(string checkId, bool ok, string message, DateTimeOffset at);
    void TouchPage(DateTimeOffset at);
}

public sealed class InMemoryStatusStore : IStatusStore
{
    private readonly object _gate = new();
    private readonly StatusPageState _state;

    public InMemoryStatusStore(StatusPageState state)
    {
        _state = state;
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
        if (!CheckTarget.TryParse(request.Target, request.Type, out var target, out var error))
        {
            throw new ArgumentException(error);
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ArgumentException("Name is required.");
        }

        var interval = request.IntervalSeconds ?? 60;
        var timeout = request.TimeoutSeconds ?? 10;
        if (interval is < 10 or > 86_400)
        {
            throw new ArgumentException("Interval must be between 10 and 86400 seconds.");
        }

        if (timeout is < 1 or > 120)
        {
            throw new ArgumentException("Timeout must be between 1 and 120 seconds.");
        }

        var expected = request.ExpectedStatus ?? 200;
        if (target.Type != CheckType.Tcp && expected is < 100 or > 599)
        {
            throw new ArgumentException("Expected HTTP status must be between 100 and 599.");
        }

        lock (_gate)
        {
            Component component;
            if (!string.IsNullOrWhiteSpace(request.ComponentId))
            {
                component = _state.Components.FirstOrDefault(c => c.Id == request.ComponentId)
                            ?? throw new ArgumentException($"Unknown component '{request.ComponentId}'.");
                if (component.Group)
                {
                    throw new ArgumentException("Checks must map to a leaf component, not a group.");
                }
            }
            else
            {
                if (!string.IsNullOrWhiteSpace(request.GroupId)
                    && _state.Components.All(c => c.Id != request.GroupId || !c.Group))
                {
                    throw new ArgumentException($"Unknown component group '{request.GroupId}'.");
                }

                var now = DateTimeOffset.UtcNow;
                component = new Component
                {
                    Id = NewId(),
                    Name = string.IsNullOrWhiteSpace(request.ComponentName) ? request.Name.Trim() : request.ComponentName.Trim(),
                    Description = $"Monitored {target.Type.ApiValue()} check: {request.Target.Trim()}",
                    Status = ComponentStatus.Operational,
                    GroupId = string.IsNullOrWhiteSpace(request.GroupId) ? null : request.GroupId,
                    Position = _state.Components.Count + 1,
                    CreatedAt = now,
                    UpdatedAt = now
                };
                _state.Components.Add(component);
            }

            var check = new StatusCheck
            {
                Id = NewId(),
                Name = request.Name.Trim(),
                Target = request.Target.Trim(),
                Type = target.Type,
                IntervalSeconds = interval,
                TimeoutSeconds = timeout,
                ExpectedStatus = expected,
                Keyword = string.IsNullOrWhiteSpace(request.Keyword) ? null : request.Keyword,
                ComponentId = component.Id,
                FailureThreshold = request.FailureThreshold is > 0 ? request.FailureThreshold.Value : 3,
                SuccessThreshold = request.SuccessThreshold is > 0 ? request.SuccessThreshold.Value : 1,
                NextRunAt = DateTimeOffset.UtcNow,
                CreatedAt = DateTimeOffset.UtcNow
            };
            _state.Checks.Add(check);
            _state.Page.UpdatedAt = DateTimeOffset.UtcNow;
            return Clone(check);
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

            if (status.IsUnresolvedIncident() || status == IncidentStatus.InProgress)
            {
                ApplyImpactToComponents(ids, impact, now);
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
                    component.Status = componentStatus;
                    component.UpdatedAt = now;
                }
            }
            else if (incident.Status is IncidentStatus.Resolved or IncidentStatus.Completed)
            {
                foreach (var component in _state.Components.Where(c => incident.ComponentIds.Contains(c.Id)))
                {
                    component.Status = ComponentStatus.Operational;
                    component.UpdatedAt = now;
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
            component.Status = status;
            component.UpdatedAt = now;
            RefreshGroupStatuses(now);
            _state.Page.UpdatedAt = now;
            return Clone(component);
        }
    }

    public void RecordCheckResult(string checkId, bool ok, string message, DateTimeOffset at)
    {
        lock (_gate)
        {
            var check = _state.Checks.FirstOrDefault(c => c.Id == checkId);
            if (check is null)
            {
                return;
            }

            check.LastRunAt = at;
            check.NextRunAt = at.AddSeconds(Math.Max(10, check.IntervalSeconds));
            check.LastOk = ok;
            check.LastMessage = message;
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

            var component = _state.Components.FirstOrDefault(c => c.Id == check.ComponentId);
            if (component is null || component.Status == ComponentStatus.UnderMaintenance)
            {
                _state.Page.UpdatedAt = at;
                return;
            }

            var next = StatusRollup.FromCheckStreak(
                check.ConsecutiveFailures,
                check.ConsecutiveSuccesses,
                check.FailureThreshold,
                check.SuccessThreshold);
            if (component.Status != next)
            {
                component.Status = next;
                component.UpdatedAt = at;
            }

            RefreshGroupStatuses(at);
            _state.Page.UpdatedAt = at;
        }
    }

    public void TouchPage(DateTimeOffset at)
    {
        lock (_gate)
        {
            _state.Page.UpdatedAt = at;
        }
    }

    private void ApplyImpactToComponents(IEnumerable<string> componentIds, IncidentImpact impact, DateTimeOffset at)
    {
        var status = DomainEnums.ForImpact(impact);
        if (impact == IncidentImpact.None)
        {
            return;
        }

        foreach (var component in _state.Components.Where(c => componentIds.Contains(c.Id) && !c.Group))
        {
            component.Status = status;
            component.UpdatedAt = at;
        }
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
        UpdatedAt = component.UpdatedAt
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
        ScheduledUntil = incident.ScheduledUntil
    };

    private static StatusCheck Clone(StatusCheck check) => new()
    {
        Id = check.Id,
        Name = check.Name,
        Target = check.Target,
        Type = check.Type,
        IntervalSeconds = check.IntervalSeconds,
        TimeoutSeconds = check.TimeoutSeconds,
        ExpectedStatus = check.ExpectedStatus,
        Keyword = check.Keyword,
        ComponentId = check.ComponentId,
        FailureThreshold = check.FailureThreshold,
        SuccessThreshold = check.SuccessThreshold,
        ConsecutiveFailures = check.ConsecutiveFailures,
        ConsecutiveSuccesses = check.ConsecutiveSuccesses,
        LastRunAt = check.LastRunAt,
        NextRunAt = check.NextRunAt,
        LastOk = check.LastOk,
        LastMessage = check.LastMessage,
        CreatedAt = check.CreatedAt
    };
}
