import { AppShell } from "@/components/AppShell";
import { emptyHeatmapHeading } from "@/lib/activityHeatmap";
import { requireFamily } from "@/lib/family";

export default async function EmptyHeatmapPage() {
  await requireFamily();
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="empty-heatmap-heading">
        {emptyHeatmapHeading()}
      </h1>
      <p className="mt-3 text-bark">A month with no additions stays blank on the heatmap.</p>
    </AppShell>
  );
}
