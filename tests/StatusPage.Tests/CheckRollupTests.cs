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
        store.CreateCheck(Check("only", "cca-api"));
        Fail(store, "only", 1);

        var check = store.ListChecks().Single(c => c.Name == "only");
        Assert.Equal(CheckResultStatus.Fail, check.LastResult!.Status);
        Assert.Equal(CheckState.Up, check.State);
        Assert.Equal(ComponentStatus.Operational, store.FindComponent("cca-api")!.Status);
        Assert.DoesNotContain(
            store.ComponentCheckStatuses().Single(s => s.ComponentId == "cca-api").Status,
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
        store.UpdateComponentStatus("cca-api", ComponentStatus.DegradedPerformance);
        Assert.Equal(ComponentStatus.DegradedPerformance, store.FindComponent("cca-api")!.Status);
    }

    [Fact]
    public void Store_rolls_up_n_checks_and_opens_auto_incident()
    {
        var store = EmptyStore();
        store.CreateCheck(Check("a", "cca-api"));
        store.CreateCheck(Check("b", "cca-api"));

        Fail(store, "a", 3);
        Assert.Equal(ComponentStatus.PartialOutage, store.FindComponent("cca-api")!.Status);
        Assert.Contains(store.Snapshot().Incidents, i => i.AutoFromChecks && i.Status == IncidentStatus.Investigating);

        Fail(store, "b", 3);
        Assert.Equal(ComponentStatus.MajorOutage, store.FindComponent("cca-api")!.Status);

        Succeed(store, "a", 2);
        Succeed(store, "b", 2);
        Assert.Equal(ComponentStatus.Operational, store.FindComponent("cca-api")!.Status);
        Assert.Contains(store.Snapshot().Incidents, i => i.AutoFromChecks && i.Status == IncidentStatus.Resolved);
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
            ["cca-dashboard"],
            null,
            null), false);
        store.CreateCheck(Check("dash", "cca-dashboard"));
        Fail(store, "dash", 3);
        Succeed(store, "dash", 2);
        Assert.Equal(IncidentStatus.Investigating, store.Snapshot().Incidents.First(i => i.Id == incident.Id).Status);
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
