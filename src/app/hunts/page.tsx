import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { huntHeading, huntsIndexHeading } from "@/lib/hunt";
import { HuntForm } from "@/app/hunt/ui";

export default async function HuntsPage() {
  const ctx = await requireFamily();
  const hunts = await prisma.hunt.findMany({
    where: { familyId: ctx.family.id },
    include: { clues: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="hunts-heading">{huntsIndexHeading(hunts.length)}</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Clues that point to a letter, a photograph, or a place, with the answer cited back to the archive.
      </p>
      {canWrite(ctx.role) ? <HuntForm /> : null}
      <ul className="mt-10 space-y-3" data-testid="hunts-list">
        {hunts.map((hunt) => (
          <li key={hunt.id} className="paper-card p-5">
            <Link href={`/hunts/${hunt.id}`} className="font-display text-2xl text-seal">
              {huntHeading(hunt.title, hunt.clues.length)}
            </Link>
            {hunt.notes ? <p className="text-bark">{hunt.notes}</p> : null}
          </li>
        ))}
        {!hunts.length ? <li className="text-bark">Start a hunt and hide a letter in the clues.</li> : null}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href="/hunts/empty" className="text-seal">Hunts still missing a clue</Link>
        {" · "}
        <Link href="/hunts/uncited" className="text-seal">Clues without an archive citation</Link>
        {" · "}
        <Link href="/hunts/badges" className="text-seal">Who finished</Link>
        {" · "}
        <Link href="/hunts/unfinished" className="text-seal">Hunts without a badge</Link>
      </p>
    </AppShell>
  );
}
