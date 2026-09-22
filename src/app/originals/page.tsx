import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { HolderForm } from "@/app/register/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileOriginals, holderLine, originalsHeading } from "@/lib/originalHolder";

export default async function OriginalsPage() {
  const ctx = await requireFamily();
  const [letters, people, allLetters] = await Promise.all([
    prisma.document.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, heldById: { not: null } },
      include: { heldBy: true },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.document.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note", "will"] } },
      orderBy: { title: "asc" },
    }),
  ]);
  const rows = compileOriginals(
    letters
      .filter((letter) => letter.heldBy)
      .map((letter) => ({
        id: letter.id,
        title: letter.title,
        holder: letter.heldBy!.displayName,
        holderId: letter.heldById,
      })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="originals-heading">
        {originalsHeading(rows.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Who holds the physical original. The digitize queue stays on its own page.{" "}
        <Link href="/digitize" className="text-seal">Digitize queue</Link>
        {" · "}
        <Link href="/originals/missing" className="text-seal">Originals without a holder</Link>
      </p>
      {canWrite(ctx.role) ? (
        <HolderForm
          people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
          letters={allLetters.map((letter) => ({ id: letter.id, title: letter.title }))}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="originals-list">
        {rows.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/letters/${row.id}`} className="font-display text-2xl text-seal">{row.title}</Link>
            <p className="text-bark">{holderLine(row.title, row.holder)}</p>
          </li>
        ))}
        {!rows.length ? <li className="text-bark">{originalsHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
