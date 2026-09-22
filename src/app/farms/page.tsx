import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatYear } from "@/lib/dates";

export default async function FarmsPage() {
  const ctx = await requireFamily();
  const [farms, homes] = await Promise.all([
    prisma.familyFarm.findMany({
      where: { familyId: ctx.family.id },
      include: { home: true },
      orderBy: { title: "asc" },
    }),
    prisma.familyHome.findMany({ where: { familyId: ctx.family.id }, orderBy: { title: "asc" } }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="farms-heading">Farmsteads</h1>
      <p className="mt-3 max-w-2xl text-bark">Farms tied to the houses that still stand on them.</p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="farm"
          action="/api/later-records"
          testId="farm-form"
          submit="Add the farm"
          fields={[
            { name: "title", placeholder: "North farm", required: true },
            { name: "place", placeholder: "Cedar Falls, Iowa" },
            { name: "homeId", label: "Tied to a home", options: homes.map((home) => ({ id: home.id, label: home.title })) },
            { name: "startedOn", placeholder: "Started", type: "date" },
            { name: "endedOn", placeholder: "Ended", type: "date" },
            { name: "notes", placeholder: "Notes" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="farms-list">
        {farms.map((farm) => (
          <li key={farm.id} className="paper-card p-5">
            <p className="font-display text-2xl">{farm.title}</p>
            <p className="text-bark">
              {farm.place || ""}
              {farm.home ? (
                <>
                  {" · "}
                  <Link href={`/homes/${farm.home.id}`} className="text-seal">{farm.home.title}</Link>
                </>
              ) : null}
              {farm.startedOn || farm.endedOn ? ` · ${formatYear(farm.startedOn) || "?"}–${formatYear(farm.endedOn) || ""}` : ""}
            </p>
          </li>
        ))}
        {!farms.length ? <li className="text-bark">No farms recorded yet.</li> : null}
      </ul>
    </AppShell>
  );
}
