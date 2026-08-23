using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Tests;

public class StatusRollupTests
{
    [Fact]
    public void Empty_is_all_systems_operational()
    {
        var status = StatusRollup.FromStatuses([]);
        Assert.Equal(PageIndicator.None, status.Indicator);
        Assert.Equal("All Systems Operational", status.Description);
        Assert.Equal("All Systems Operational", status.Banner);
    }

    [Fact]
    public void Single_major_outage_is_critical()
    {
        var status = StatusRollup.FromStatuses([ComponentStatus.MajorOutage]);
        Assert.Equal(PageIndicator.Critical, status.Indicator);
        Assert.Equal("Major System Outage", status.Description);
        Assert.Equal("Major Outage", status.Banner);
    }

    [Fact]
    public void Single_maintenance_uses_maintenance_banner()
    {
        var status = StatusRollup.FromStatuses([ComponentStatus.UnderMaintenance]);
        Assert.Equal(PageIndicator.None, status.Indicator);
        Assert.Equal("System Under Maintenance", status.Description);
        Assert.Equal("Under Maintenance", status.Banner);
    }

    [Fact]
    public void Any_major_among_many_is_partial_system_outage_not_critical()
    {
        var status = StatusRollup.FromStatuses(
        [
            ComponentStatus.Operational,
            ComponentStatus.MajorOutage,
            ComponentStatus.Operational
        ]);
        Assert.Equal(PageIndicator.Major, status.Indicator);
        Assert.Equal("Partial System Outage", status.Description);
        Assert.Equal("Partial Outage", status.Banner);
    }

    [Fact]
    public void All_major_is_critical()
    {
        var status = StatusRollup.FromStatuses(
        [
            ComponentStatus.MajorOutage,
            ComponentStatus.MajorOutage
        ]);
        Assert.Equal(PageIndicator.Critical, status.Indicator);
        Assert.Equal("Major Outage", status.Banner);
    }

    [Fact]
    public void Any_partial_outage_is_minor_when_nothing_worse()
    {
        var status = StatusRollup.FromStatuses(
        [
            ComponentStatus.Operational,
            ComponentStatus.PartialOutage
        ]);
        Assert.Equal(PageIndicator.Minor, status.Indicator);
        Assert.Equal("Minor Service Outage", status.Description);
        Assert.Equal("Partial Outage", status.Banner);
    }

    [Fact]
    public void Degraded_rolls_up_to_minor()
    {
        var status = StatusRollup.FromStatuses(
        [
            ComponentStatus.Operational,
            ComponentStatus.DegradedPerformance
        ]);
        Assert.Equal(PageIndicator.Minor, status.Indicator);
        Assert.Equal("Partially Degraded Service", status.Description);
    }

    [Fact]
    public void All_degraded_uses_degraded_system_service()
    {
        var status = StatusRollup.FromStatuses(
        [
            ComponentStatus.DegradedPerformance,
            ComponentStatus.DegradedPerformance
        ]);
        Assert.Equal(PageIndicator.Minor, status.Indicator);
        Assert.Equal("Degraded System Service", status.Description);
    }

    [Fact]
    public void Group_components_are_ignored_for_page_rollup()
    {
        var status = StatusRollup.FromComponents(
        [
            new Component { Name = "Product", Group = true, Status = ComponentStatus.MajorOutage },
            new Component { Name = "API", Group = false, Status = ComponentStatus.Operational },
            new Component { Name = "UI", Group = false, Status = ComponentStatus.Operational }
        ]);
        Assert.Equal(PageIndicator.None, status.Indicator);
    }

}
