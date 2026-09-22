import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { CrestForm } from "@/app/register/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileCrests, crestLine, crestsHeading } from "@/lib/familyCrest";

export default async function CrestsPage() {
  const ctx = await requireFamily();
  const rows = compileCrests(await prisma.familyCrest.findMany({ where: { familyId: ctx.family.id } }));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="crests-heading">
        {crestsHeading(rows.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        The family arms in words a relative can still read.{" "}
        <Link href="/mottos" className="text-seal">Mottos</Link>
        {" · "}
        <Link href="/crests/missing" className="text-seal">Families without a crest</Link>
      </p>
      {canWrite(ctx.role) ? <CrestForm /> : null}
      <ul className="mt-10 space-y-3" data-testid="crests-list">
        {rows.map((row) => (
          <li key={row.id} className="paper-card p-8" data-testid="family-crest">
            <p className="font-display text-3xl">{row.title}</p>
            <p className="mt-2 text-bark">{crestLine(row.title, row.blazon)}</p>
            {row.tincture ? <p className="mt-2 font-sans text-sm text-gold">{row.tincture}</p> : null}
            {row.notes ? <p className="mt-2 text-bark">{row.notes}</p> : null}
          </li>
        ))}
        {!rows.length ? <li className="text-bark">{crestsHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={crestsHeading(rows.length)} path="/crests" />
    </AppShell>
  );
}
