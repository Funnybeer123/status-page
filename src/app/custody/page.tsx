import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatDate } from "@/lib/dates";

export default async function CustodyPage() {
  const ctx = await requireFamily();
  const [people, documents, assets, records] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.document.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { title: "asc" } }),
    prisma.asset.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { title: "asc" } }),
    prisma.custodyRecord.findMany({
      where: { familyId: ctx.family.id },
      include: { holder: true, document: true, asset: true },
      orderBy: { title: "asc" },
    }),
  ]);
  const options = people.map((person) => ({ id: person.id, displayName: person.displayName }));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="custody-heading">Custody of originals</h1>
      <p className="mt-3 max-w-2xl text-bark">Who holds the physical letter, photograph, or Bible.</p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="custody"
          action="/api/custody"
          testId="custody-form"
          submit="Record who holds it"
          fields={[
            { name: "holderId", people: options, label: "Who holds it", required: true },
            { name: "title", placeholder: "Harvest-dance letter", required: true },
            { name: "kind", placeholder: "letter, photo, or Bible", required: true },
            { name: "documentId", options: documents.map((item) => ({ id: item.id, label: item.title })), label: "Linked letter (optional)" },
            { name: "assetId", options: assets.map((item) => ({ id: item.id, label: item.title || "Untitled" })), label: "Linked photo (optional)" },
            { name: "sinceOn", placeholder: "Since", type: "date" },
            { name: "notes", placeholder: "Where it lives" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="custody-list">
        {records.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{row.title}</p>
            <p className="text-bark">
              <Link href={`/people/${row.holderId}`} className="text-seal">{row.holder.displayName}</Link>
              {` holds the ${row.kind}`}
              {row.sinceOn ? ` · since ${formatDate(row.sinceOn)}` : ""}
            </p>
            {row.document ? (
              <p className="mt-2">
                <Link href={`/letters/${row.document.id}`} className="text-seal">{row.document.title}</Link>
              </p>
            ) : null}
            {row.asset ? (
              <p className="mt-2">
                <Link href={`/archive/${row.asset.id}`} className="text-seal">{row.asset.title}</Link>
              </p>
            ) : null}
            {row.notes ? <p className="mt-2 text-bark">{row.notes}</p> : null}
          </li>
        ))}
        {!records.length ? <li className="text-bark">No one has claimed an original yet.</li> : null}
      </ul>
    </AppShell>
  );
}
