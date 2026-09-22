import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingSittersHeading } from "@/lib/portraitSitter";

export default async function MissingSittersPage() {
  const ctx = await requireFamily();
  const untitled = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: "photo", sitterId: null },
    orderBy: { title: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-sitters-heading">
        {missingSittersHeading(untitled.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-sitters-list">
        {untitled.map((photo) => (
          <li key={photo.id} className="paper-card p-5">
            <Link href="/sitters" className="font-display text-2xl text-seal">
              {photo.title || "Untitled portrait"}
            </Link>
          </li>
        ))}
        {!untitled.length ? <li className="text-bark">{missingSittersHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
