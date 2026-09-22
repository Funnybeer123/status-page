import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { MysteryGuessForm } from "@/app/alive-when/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileMysteryQueue, emptyMysteryHeading, mysteryHeading } from "@/lib/photoMystery";

export default async function MysteryPage() {
  const ctx = await requireFamily();
  const [photos, guesses, people] = await Promise.all([
    prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["photo", "video"] } },
      include: { tags: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.photoGuess.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true, user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.person.findMany({
      where: { familyId: ctx.family.id, deletedAt: null },
      orderBy: { displayName: "asc" },
    }),
  ]);
  const items = compileMysteryQueue(photos, guesses);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="mystery-heading">
        {mysteryHeading(items.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Faces nobody has named yet, with guesses from relatives.{" "}
        <Link href="/unidentified" className="text-seal">Unidentified photographs</Link>
        {" · "}
        <Link href="/mystery/empty" className="text-seal">Empty mystery queue</Link>
        {" · "}
        <Link href="/mystery/unnamed" className="text-seal">Guesses without a name</Link>
      </p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2" data-testid="mystery-list">
        {items.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <Link href={item.href} className="font-display text-2xl text-seal">
              {item.title}
            </Link>
            <ul className="mt-3 space-y-1" data-testid={`mystery-guesses-${item.id}`}>
              {item.guesses.map((guess, index) => (
                <li key={`${item.id}-${index}`} className="text-bark">
                  {guess.line}
                </li>
              ))}
              {!item.guesses.length ? <li className="text-bark">No guesses yet.</li> : null}
            </ul>
            {canWrite(ctx.role) ? (
              <MysteryGuessForm
                assetId={item.id}
                people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
              />
            ) : null}
          </li>
        ))}
        {!items.length ? <li className="text-bark">{emptyMysteryHeading()}</li> : null}
      </ul>
      <CiteBlock title={mysteryHeading(items.length)} path="/mystery" />
    </AppShell>
  );
}
