import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileActivityHeatmap } from "@/lib/activityHeatmap";

export default async function HeatmapPage() {
  const ctx = await requireFamily();
  const activities = await prisma.activity.findMany({
    where: { familyId: ctx.family.id },
    select: { createdAt: true },
  });
  const heat = compileActivityHeatmap(activities);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="heatmap-heading">
        {heat.heading}
      </h1>
      <p className="mt-3 text-bark">
        Archive activity by month.{" "}
        <Link href="/activity" className="text-seal">Activity</Link>
        {" · "}
        <Link href="/activity/heatmap/hottest" className="text-seal">Busiest month</Link>
        {" · "}
        <Link href="/activity/heatmap/empty" className="text-seal">A quiet heatmap</Link>
      </p>
      <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="heatmap">
        {heat.months.map((month) => (
          <li key={month.month} className="paper-card p-4" data-testid="heatmap-cell">
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{month.month}</p>
            <p className="mt-2 font-display text-3xl">{month.count}</p>
            <div className="mt-3 h-2 rounded-full bg-bark/10">
              <div className="h-2 rounded-full bg-seal" style={{ width: `${Math.round(month.intensity * 100)}%` }} />
            </div>
          </li>
        ))}
        {!heat.months.length ? <li className="text-bark">{heat.heading}</li> : null}
      </ul>
      <CiteBlock title={heat.heading} path="/activity/heatmap" />
    </AppShell>
  );
}
