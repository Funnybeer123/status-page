import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatDate } from "@/lib/dates";
import { biblePageHeading, hasBiblePage } from "@/lib/biblePage";
import { BiblePageForm } from "@/app/ask-save/ui";

export default async function BiblesPage() {
  const ctx = await requireFamily();
  const [people, records, assets] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.bibleRecord.findMany({ where: { familyId: ctx.family.id }, include: { holder: true, page: true }, orderBy: { title: "asc" } }),
    prisma.asset.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { title: "asc" } }),
  ]);
  const options = people.map((person) => ({ id: person.id, displayName: person.displayName }));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="bibles-heading">Family Bibles</h1>
      <p className="mt-3 max-w-2xl text-bark">
        What was written in the flyleaf.{" "}
        <Link href="/bibles/missing" className="text-seal">Bibles missing a page image</Link>.
      </p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="bible"
          testId="bible-form"
          submit="Save the Bible note"
          fields={[
            { name: "title", placeholder: "Hart family Bible", required: true },
            { name: "holderId", people: options, label: "Who keeps it" },
            { name: "body", placeholder: "What the flyleaf says", required: true },
            { name: "recordedAt", placeholder: "Dated", type: "date" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="bibles-list">
        {records.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{row.title}</p>
            <p className="text-bark">
              {row.holder ? row.holder.displayName : "Family Bible"}
              {row.recordedAt ? ` · ${formatDate(row.recordedAt)}` : ""}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-bark">{row.body}</p>
            {hasBiblePage(row) && row.page ? (
              <figure className="mt-4" data-testid="bible-page">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/media/${row.page.storagePath}`} alt={biblePageHeading(row.title)} className="w-full bg-cream" />
                <figcaption className="mt-2 font-sans text-sm text-gold">{biblePageHeading(row.title)}</figcaption>
              </figure>
            ) : canWrite(ctx.role) ? (
              <BiblePageForm bibleId={row.id} assets={assets.map((asset) => ({ id: asset.id, title: asset.title }))} />
            ) : null}
          </li>
        ))}
        {!records.length ? <li className="text-bark">No Bible records yet.</li> : null}
      </ul>
    </AppShell>
  );
}
