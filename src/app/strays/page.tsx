import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { StrayForm } from "@/app/shelling/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileStrays, strayNoticeLine, straysHeading } from "@/lib/strayNotice";

export default async function StraysPage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.strayNotice.findMany({ where: { familyId: ctx.family.id }, include: { person: true } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileStrays(
    rows.map((row) => ({
      id: row.id,
      person: row.person.displayName,
      animal: row.animal,
      postedOn: row.postedOn,
      place: row.place,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="strays-heading">
        {straysHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        A stray-animal notice: who posted it, and which animal.{" "}
        <Link href="/strays/missing" className="text-seal">Missing notice</Link>
      </p>
      {canWrite(ctx.role) ? (
        <StrayForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="strays-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{strayNoticeLine(row.person, row.animal, row.postKey)}</p>
            {row.place ? <p className="font-sans text-sm text-bark">{row.place}</p> : null}
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{straysHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={straysHeading(compiled.length)} path="/strays" />
    </AppShell>
  );
}
