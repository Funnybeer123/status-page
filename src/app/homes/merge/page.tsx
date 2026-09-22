import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { HomeMergeForm } from "@/app/attach/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { homeDuplicateHeading, suggestHomeDuplicates } from "@/lib/homeDuplicates";

export default async function HomeMergePage() {
  const ctx = await requireFamily();
  const homes = await prisma.familyHome.findMany({
    where: { familyId: ctx.family.id },
    orderBy: { title: "asc" },
  });
  const groups = suggestHomeDuplicates(homes);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">
        <Link href="/homes" className="text-seal">Homes</Link>
      </p>
      <h1 className="mt-2 font-display text-4xl" data-testid="home-merge-heading">Merge duplicate homes</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Fold a second listing of the same house into the one you want to keep. Photographs, who lived there, land, and farms move with it.
      </p>
      <p className="mt-3 font-sans text-sm text-gold">{homeDuplicateHeading(groups.length)}</p>
      {canWrite(ctx.role) ? (
        <HomeMergeForm homes={homes.map((home) => ({ id: home.id, title: home.title }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="home-merge-list">
        {homes.map((home) => (
          <li key={home.id} className="paper-card p-5">
            <Link href={`/homes/${home.id}`} className="font-display text-2xl text-seal">{home.title}</Link>
            <p className="text-bark">{[home.line, home.locality].filter(Boolean).join(", ")}</p>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
