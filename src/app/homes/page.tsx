import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";

export default async function HomesPage() {
  const ctx = await requireFamily();
  const [people, homes] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.familyHome.findMany({
      where: { familyId: ctx.family.id },
      include: { photos: true, residents: { include: { person: true } } },
      orderBy: { title: "asc" },
    }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="homes-heading">Homes</h1>
      <p className="mt-3 max-w-2xl text-bark">A house with photographs across the years, and who lived there.</p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="home"
          action="/api/homes"
          testId="home-form"
          submit="Add the house"
          fields={[
            { name: "title", placeholder: "Whitaker house", required: true },
            { name: "line", placeholder: "14 Market Street" },
            { name: "locality", placeholder: "Cedar Falls" },
            { name: "region", placeholder: "Iowa" },
            { name: "notes", placeholder: "What the family still says" },
            { name: "personIds", people: people.map((person) => ({ id: person.id, displayName: person.displayName })), label: "Who lived there" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="homes-list">
        {homes.map((home) => (
          <li key={home.id} className="paper-card p-5">
            <Link href={`/homes/${home.id}`} className="font-display text-2xl text-seal">{home.title}</Link>
            <p className="text-bark">{[home.line, home.locality, home.region].filter(Boolean).join(", ")}</p>
            <p className="font-sans text-sm text-gold">
              {home.photos.length} photographs · {home.residents.map((row) => row.person.displayName).join(", ")}
            </p>
          </li>
        ))}
        {!homes.length ? <li className="text-bark">No houses recorded yet.</li> : null}
      </ul>
    </AppShell>
  );
}
