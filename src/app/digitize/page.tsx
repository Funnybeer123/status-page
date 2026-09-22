import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";

export default async function DigitizePage() {
  const ctx = await requireFamily();
  const [people, items, letters, bibles] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.digitizeItem.findMany({ where: { familyId: ctx.family.id, doneAt: null }, include: { holder: true }, orderBy: { createdAt: "asc" } }),
    prisma.document.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, assetId: null, kind: { in: ["letter", "note"] } },
      orderBy: { title: "asc" },
    }),
    prisma.bibleRecord.findMany({ where: { familyId: ctx.family.id }, include: { holder: true } }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="digitize-heading">Digitization queue</h1>
      <p className="mt-3 max-w-2xl text-bark">Physical letters, photographs, and Bibles that still need a scan.</p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="digitize"
          action="/api/digitize"
          testId="digitize-form"
          submit="Add to the queue"
          fields={[
            { name: "title", placeholder: "Ruth’s reply, still in the cedar chest", required: true },
            { name: "kind", placeholder: "letter, photo, or Bible", required: true },
            { name: "holderId", people: people.map((person) => ({ id: person.id, displayName: person.displayName })), label: "Who holds it" },
            { name: "notes", placeholder: "Where it lives" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="digitize-list">
        {items.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <p className="font-display text-2xl">{item.title}</p>
            <p className="text-bark">{item.kind}{item.holder ? ` · ${item.holder.displayName}` : ""}</p>
            {item.notes ? <p className="mt-2 text-bark">{item.notes}</p> : null}
          </li>
        ))}
        {letters.map((letter) => (
          <li key={letter.id} className="paper-card p-5">
            <p className="font-display text-2xl">{letter.title}</p>
            <p className="text-bark">Letter in the archive with no scan yet.</p>
          </li>
        ))}
        {bibles.map((bible) => (
          <li key={bible.id} className="paper-card p-5">
            <p className="font-display text-2xl">{bible.title}</p>
            <p className="text-bark">Bible{bible.holder ? ` · ${bible.holder.displayName}` : ""}</p>
          </li>
        ))}
        {!items.length && !letters.length && !bibles.length ? <li className="text-bark">Nothing waiting to be scanned.</li> : null}
      </ul>
    </AppShell>
  );
}
