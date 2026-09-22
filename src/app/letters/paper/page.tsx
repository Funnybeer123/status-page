import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PaperPickForm } from "@/app/register/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compilePaperMills, paperHeading } from "@/lib/paperMill";

export default async function PaperMillsPage() {
  const ctx = await requireFamily();
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] } },
    orderBy: { title: "asc" },
  });
  const rows = compilePaperMills(letters);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="paper-heading">
        {paperHeading(rows.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Which mill made the paper, separate from postage and the fold.{" "}
        <Link href="/letters/postage" className="text-seal">Postage</Link>
        {" · "}
        <Link href="/letters/folds" className="text-seal">Folds</Link>
        {" · "}
        <Link href="/letters/paper/missing" className="text-seal">Letters without a mill</Link>
      </p>
      {canWrite(ctx.role) ? (
        <PaperPickForm letters={letters.map((letter) => ({ id: letter.id, title: letter.title }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="paper-list">
        {rows.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/letters/${row.id}`} className="font-display text-2xl text-seal">{row.title}</Link>
            <p className="text-bark">{row.line}</p>
          </li>
        ))}
        {!rows.length ? <li className="text-bark">{paperHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
