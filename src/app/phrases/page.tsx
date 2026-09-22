import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PhraseForm } from "@/app/register/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compilePhrases, phraseLine, phrasesHeading } from "@/lib/phrasebook";

export default async function PhrasesPage() {
  const ctx = await requireFamily();
  const rows = compilePhrases(await prisma.familyPhrase.findMany({ where: { familyId: ctx.family.id } }));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="phrases-heading">
        {phrasesHeading(rows.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Sayings the family still uses, and what they mean. Separate from mottos.{" "}
        <Link href="/mottos" className="text-seal">Mottos</Link>
        {" · "}
        <Link href="/quotes" className="text-seal">Quotes</Link>
        {" · "}
        <Link href="/phrases/missing" className="text-seal">Empty phrasebook</Link>
      </p>
      {canWrite(ctx.role) ? <PhraseForm /> : null}
      <ul className="mt-10 space-y-3" data-testid="phrases-list">
        {rows.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{row.phrase}</p>
            <p className="text-bark">{phraseLine(row.phrase, row.meaning)}</p>
            {row.language ? <p className="font-sans text-sm text-gold">{row.language}</p> : null}
          </li>
        ))}
        {!rows.length ? <li className="text-bark">{phrasesHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
