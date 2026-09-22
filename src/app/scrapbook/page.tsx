import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { FirstEventForm } from "@/app/firsts/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { hideEventFromViewer } from "@/lib/privacy";
import { compileScrapbook, emptyScrapbookHeading, scrapbookHeading } from "@/lib/scrapbook";

export default async function ScrapbookPage() {
  const ctx = await requireFamily();
  const [events, people] = await Promise.all([
    prisma.lifeEvent.findMany({
      where: { familyId: ctx.family.id, firstTag: { not: null } },
      include: { person: true },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const items = compileScrapbook(events.filter((event) => !hideEventFromViewer(ctx.role, event)));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="scrapbook-heading">
        {items.length ? scrapbookHeading(items.length) : emptyScrapbookHeading()}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        First house, first car, first child — tagged events the family still tells.{" "}
        <Link href="/firsts" className="text-seal">The earliest firsts</Link>
        {" · "}
        <Link href="/scrapbook/empty" className="text-seal">Empty scrapbook</Link>
        {" · "}
        <Link href="/scrapbook/undated" className="text-seal">Undated firsts</Link>
        {" · "}
        <Link href="/scrapbook/people" className="text-seal">People without a first</Link>
      </p>
      {canWrite(ctx.role) ? (
        <FirstEventForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="scrapbook-list">
        {items.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <p className="font-sans text-xs uppercase tracking-wide text-gold">{item.label}</p>
            <Link href={item.href} className="font-display text-2xl text-seal">{item.title}</Link>
            <p className="text-bark">
              {item.personName}
              {item.personName ? " · " : ""}
              {item.when}
            </p>
          </li>
        ))}
        {!items.length ? <li className="text-bark">{emptyScrapbookHeading()}</li> : null}
      </ul>
    </AppShell>
  );
}
