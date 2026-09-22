import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { SpellingForm } from "@/app/pallbearer/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileSpellings, spellingLine, spellingsHeading } from "@/lib/surnameSpellings";

export default async function SpellingsPage() {
  const ctx = await requireFamily();
  const rows = compileSpellings(await prisma.surnameSpelling.findMany({ where: { familyId: ctx.family.id } }));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="spellings-heading">
        {spellingsHeading(rows.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        How one surname was spelled across records.{" "}
        <Link href="/surnames" className="text-seal">Surnames</Link>
        {" · "}
        <Link href="/spellings/missing" className="text-seal">Surnames without a variant</Link>
      </p>
      {canWrite(ctx.role) ? <SpellingForm /> : null}
      <ul className="mt-10 space-y-3" data-testid="spellings-list">
        {rows.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{spellingLine(row.surname, row.variant, row.source)}</p>
          </li>
        ))}
        {!rows.length ? <li className="text-bark">{spellingsHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={spellingsHeading(rows.length)} path="/spellings" />
    </AppShell>
  );
}
