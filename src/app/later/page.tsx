import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileReadLater, emptyShelfHeading, readLaterHeading } from "@/lib/readLater";

export default async function ReadLaterPage() {
  const ctx = await requireFamily();
  const rows = await prisma.readLater.findMany({
    where: { familyId: ctx.family.id, userId: ctx.session.user.id },
    include: { document: true, story: true },
  });
  const items = compileReadLater(rows);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="read-later-heading">
        {items.length ? readLaterHeading(items.length) : emptyShelfHeading()}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Letters and stories to come back to. This shelf is yours alone.{" "}
        <Link href="/later/empty" className="text-seal">Empty shelf</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="read-later-list">
        {items.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <Link href={item.href} className="font-display text-2xl text-seal">
              {item.line}
            </Link>
          </li>
        ))}
        {!items.length ? <li className="text-bark">{emptyShelfHeading()}</li> : null}
      </ul>
      <CiteBlock title={readLaterHeading(items.length)} path="/later" />
    </AppShell>
  );
}
