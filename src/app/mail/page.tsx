import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { MailBoxForm, MailRouteForm } from "@/app/quilting/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileMailBoxes, mailBoxLine, mailRouteHeading, mailRoutesHeading } from "@/lib/ruralMail";

export default async function MailPage() {
  const ctx = await requireFamily();
  const [routes, people] = await Promise.all([
    prisma.ruralMailRoute.findMany({
      where: { familyId: ctx.family.id },
      include: { carrier: true, boxes: { include: { person: true } } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="mail-heading">
        {mailRoutesHeading(routes.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        The rural carrier, the boxes, and the delivery days.{" "}
        <Link href="/mail/missing" className="text-seal">Empty mail route</Link>
      </p>
      {canWrite(ctx.role) ? (
        <>
          <MailRouteForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
          <MailBoxForm
            people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
            routes={routes.map((route) => ({ id: route.id, name: route.name }))}
          />
        </>
      ) : null}
      <ul className="mt-10 space-y-6" data-testid="mail-list">
        {routes.map((route) => {
          const boxes = compileMailBoxes(
            route.boxes.map((box) => ({
              id: box.id,
              person: box.person.displayName,
              boxNumber: box.boxNumber,
            })),
          );
          return (
            <li key={route.id} className="paper-card p-8">
              <p className="font-display text-3xl">{mailRouteHeading(route.name, route.carrier?.displayName, route.days)}</p>
              <ol className="mt-4 space-y-2">
                {boxes.map((box) => (
                  <li key={box.id} className="text-bark">{mailBoxLine(box.person, box.boxNumber)}</li>
                ))}
              </ol>
            </li>
          );
        })}
        {!routes.length ? <li className="text-bark">{mailRoutesHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={mailRoutesHeading(routes.length)} path="/mail" />
    </AppShell>
  );
}
