import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileActivityHeatmap } from "@/lib/activityHeatmap";

export default async function HottestMonthPage() {
  const ctx = await requireFamily();
  const activities = await prisma.activity.findMany({
    where: { familyId: ctx.family.id },
    select: { createdAt: true },
  });
  const heat = compileActivityHeatmap(activities);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="hottest-month-heading">
        {heat.hottestHeading}
      </h1>
      <p className="mt-3 text-bark">
        <Link href="/activity/heatmap" className="text-seal">Activity heatmap</Link>
      </p>
      {heat.hottest ? (
        <p className="mt-8 font-display text-3xl" data-testid="hottest-month">
          {heat.hottest.month} · {heat.hottest.count}
        </p>
      ) : (
        <p className="mt-8 text-bark">{heat.hottestHeading}</p>
      )}
    </AppShell>
  );
}
