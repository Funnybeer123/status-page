using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Tests;

public class CheckRollupTests
{
    [Fact]
    public void Hysteresis_needs_three_fails_to_go_down()
    {
        var state = CheckState.Up;
        state = Apply(state, false, 1, 1);
        Assert.Equal(CheckState.Up, state);
        state = Apply(state, false, 0, 2);
        Assert.Equal(CheckState.Up, state);
        state = Apply(state, false, 0, 3);
        Assert.Equal(CheckState.Down, state);
    }

    [Fact]
    public void Hysteresis_needs_two_oks_to_go_up()
    {
        var state = CheckState.Down;
        state = Apply(state, true, 1, 0);
        Assert.Equal(CheckState.Down, state);
        state = Apply(state, true, 2, 0);
        Assert.Equal(CheckState.Up, state);
    }

    [Fact]
    public void Single_fail_does_not_map_onto_component_severity()
    {
        var store = EmptyStore();
        store.CreateCheck(Check("only", "azure"));
        Fail(store, "only", 1);

        var check = store.ListChecks().Single(c => c.Name == "only");
        Assert.Equal(CheckResultStatus.Fail, check.LastResult!.Status);
        Assert.Equal(CheckState.Up, check.State);
        Assert.Equal(ComponentStatus.Operational, store.FindComponent("azure")!.Status);
        Assert.DoesNotContain(
            store.ComponentCheckStatuses().Single(s => s.ComponentId == "azure").Status,
            new[] { ComponentStatus.DegradedPerformance, ComponentStatus.PartialOutage, ComponentStatus.MajorOutage });
    }

    [Fact]
    public void Zero_checks_leaves_operator_status()
    {
        Assert.Null(CheckRollup.FromCheckStates([]));
    }

    [Fact]
    public void One_up_is_operational()
    {
        Assert.Equal(ComponentStatus.Operational, CheckRollup.FromCheckStates([CheckState.Up]));
    }

    [Fact]
    public void One_down_is_major_outage()
    {
        Assert.Equal(ComponentStatus.MajorOutage, CheckRollup.FromCheckStates([CheckState.Down]));
    }

    [Fact]
    public void Mix_is_partial_outage()
    {
        Assert.Equal(
            ComponentStatus.PartialOutage,
            CheckRollup.FromCheckStates([CheckState.Up, CheckState.Down]));
    }

    [Fact]
    public void All_down_is_major_outage()
    {
        Assert.Equal(
            ComponentStatus.MajorOutage,
            CheckRollup.FromCheckStates([CheckState.Down, CheckState.Down]));
    }

    [Fact]
    public void Store_zero_checks_keeps_manual_status()
    {
        var store = EmptyStore();
        store.UpdateComponentStatus("azure", ComponentStatus.DegradedPerformance);
        Assert.Equal(ComponentStatus.DegradedPerformance, store.FindComponent("azure")!.Status);
    }

    [Fact]
    public void Store_rolls_up_n_checks_and_opens_auto_incident()
    {
        var store = EmptyStore();
        store.CreateCheck(Check("a", "azure"));
        store.CreateCheck(Check("b", "azure"));

        Fail(store, "a", 3);
        Assert.Equal(ComponentStatus.PartialOutage, store.FindComponent("azure")!.Status);
        Assert.Contains(store.Snapshot().Incidents, i => i.AutoFromChecks && i.Status == IncidentStatus.Investigating);

        Fail(store, "b", 3);
        Assert.Equal(ComponentStatus.MajorOutage, store.FindComponent("azure")!.Status);

        Succeed(store, "a", 2);
        Succeed(store, "b", 2);
        Assert.Equal(ComponentStatus.Operational, store.FindComponent("azure")!.Status);
        Assert.Contains(store.Snapshot().Incidents, i => i.AutoFromChecks && i.Status == IncidentStatus.Resolved);
    }

    [Fact]
    public void Create_check_adds_leaf_titled_componentName_not_probe_name()
    {
        var store = EmptyStore();
        store.CreateCheck(new CreateCheckRequest(
            "probe-label-only",
            "billing-warehouse",
            "tcp",
            true,
            15,
            5,
            3,
            2,
            new CheckTargetSpec { Host = "127.0.0.1", Port = 9 },
            null,
            "Billing warehouse",
            null));

        var leaf = store.FindComponent("billing-warehouse");
        Assert.NotNull(leaf);
        Assert.False(leaf!.Group);
        Assert.Null(leaf.GroupId);
        Assert.Equal("Billing warehouse", leaf.Name);
        Assert.NotEqual("probe-label-only", leaf.Name);
        Assert.Equal(ComponentStatus.Operational, leaf.Status);
        Assert.Equal(ComponentStatus.Operational, leaf.ManualStatus);
        Assert.Contains(store.ComponentCheckStatuses(),
            s => s.ComponentId == "billing-warehouse" && s.CheckCount == 1 && s.Status == ComponentStatus.Operational);
    }

    [Fact]
    public void Create_check_requires_componentName_for_unknown_leaf()
    {
        var store = EmptyStore();
        var ex = Assert.Throws<ArgumentException>(() => store.CreateCheck(Check("probe-label-only", "not-a-seed")));
        Assert.Contains("componentName", ex.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Null(store.FindComponent("not-a-seed"));
    }

    [Fact]
    public void Operator_incident_does_not_override_check_rollup()
    {
        var store = EmptyStore();
        store.CreateCheck(Check("api", "azure"));
        Assert.Equal(ComponentStatus.Operational, store.FindComponent("azure")!.Status);

        store.CreateIncident(new CreateIncidentRequest(
            "Operator outage note",
            "investigating",
            "critical",
            "Customers are reporting errors.",
            ["azure"],
            null,
            null), false);

        Assert.Equal(ComponentStatus.Operational, store.FindComponent("azure")!.Status);

        store.CreateIncident(new CreateIncidentRequest(
            "Operator maintenance note",
            "scheduled",
            "maintenance",
            "Window announced.",
            ["azure"],
            DateTimeOffset.UtcNow.AddHours(1),
            DateTimeOffset.UtcNow.AddHours(2)), true);

        Assert.Equal(ComponentStatus.Operational, store.FindComponent("azure")!.Status);
        Assert.NotEqual(ComponentStatus.UnderMaintenance, store.FindComponent("azure")!.Status);
    }

    [Fact]
    public void Auto_incident_does_not_resolve_operator_incident()
    {
        var store = EmptyStore();
        var incident = store.CreateIncident(new CreateIncidentRequest(
            "Manual",
            "investigating",
            "minor",
            "Operator wrote this.",
            ["github"],
            null,
            null), false);
        store.CreateCheck(Check("dash", "github"));
        Fail(store, "dash", 3);
        Succeed(store, "dash", 2);
        Assert.Equal(IncidentStatus.Investigating, store.Snapshot().Incidents.First(i => i.Id == incident.Id).Status);
    }

    [Fact]
    public void Only_under_maintenance_patch_overrides_enabled_checks()
    {
        var store = EmptyStore();
        store.CreateCheck(Check("api", "azure"));

        store.UpdateComponentStatus("azure", ComponentStatus.DegradedPerformance);
        Assert.Equal(ComponentStatus.Operational, store.FindComponent("azure")!.Status);

        store.UpdateComponentStatus("azure", ComponentStatus.UnderMaintenance);
        Assert.Equal(ComponentStatus.UnderMaintenance, store.FindComponent("azure")!.Status);

        Fail(store, "api", 3);
        Assert.Equal(ComponentStatus.UnderMaintenance, store.FindComponent("azure")!.Status);
    }

    [Fact]
    public void Resolving_operator_incident_does_not_override_check_rollup()
    {
        var store = EmptyStore();
        store.CreateCheck(Check("api", "azure"));
        Fail(store, "api", 3);
        Assert.Equal(ComponentStatus.MajorOutage, store.FindComponent("azure")!.Status);

        var incident = store.CreateIncident(new CreateIncidentRequest(
            "Operator note",
            "investigating",
            "critical",
            "Filed while checks are down.",
            ["azure"],
            null,
            null), false);

        store.UpdateIncident(incident.Id, new UpdateIncidentRequest(
            "resolved",
            "Closing the operator note.",
            null,
            null));

        Assert.Equal(IncidentStatus.Resolved, store.Snapshot().Incidents.First(i => i.Id == incident.Id).Status);
        Assert.Equal(ComponentStatus.MajorOutage, store.FindComponent("azure")!.Status);
        Assert.Contains(
            store.Snapshot().Incidents,
            i => i.AutoFromChecks && i.Status == IncidentStatus.Investigating);
    }

    private static CheckState Apply(CheckState current, bool ok, int oks, int fails) =>
        CheckRollup.NextState(current, ok, oks, fails);

    private static InMemoryStatusStore EmptyStore()
    {
        var state = DemoSeed.Create("http://localhost:5080", DateTimeOffset.UtcNow);
        state.Checks.Clear();
        return new InMemoryStatusStore(state);
    }

    private static CreateCheckRequest Check(string name, string componentId) => new(
        name,
        componentId,
        "tcp",
        true,
        15,
        5,
        3,
        2,
        new CheckTargetSpec { Host = "127.0.0.1", Port = 9 },
        null);

    private static void Fail(InMemoryStatusStore store, string name, int times)
    {
        var id = store.ListChecks().First(c => c.Name == name).Id;
        for (var i = 0; i < times; i++)
        {
            store.RecordCheckResult(id, new CheckResult
            {
                Status = CheckResultStatus.Fail,
                Error = "fail",
                CheckedAtUtc = DateTimeOffset.UtcNow
            });
        }
    }

    private static void Succeed(InMemoryStatusStore store, string name, int times)
    {
        var id = store.ListChecks().First(c => c.Name == name).Id;
        for (var i = 0; i < times; i++)
        {
            store.RecordCheckResult(id, new CheckResult
            {
                Status = CheckResultStatus.Ok,
                CheckedAtUtc = DateTimeOffset.UtcNow
            });
        }
    }
}
