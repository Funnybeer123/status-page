import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { PreferMottoButton } from "@/app/hunt/ui";

export default async function MottosPage() {
  const ctx = await requireFamily();
  const records = await prisma.familyMotto.findMany({ where: { familyId: ctx.family.id } });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="mottos-heading">Family mottos</h1>
      <p className="mt-3 max-w-2xl text-bark">Words the family still repeats.</p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="motto"
          testId="motto-form"
          submit="Keep the motto"
          fields={[
            { name: "text", placeholder: "Courtesy to the trees", required: true },
            { name: "language", placeholder: "Language" },
            { name: "notes", placeholder: "Where it is said" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="mottos-list">
        {records.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{row.text}</p>
            <p className="text-bark">{[row.language, row.notes].filter(Boolean).join(" · ")}</p>
            {canWrite(ctx.role) ? <PreferMottoButton mottoId={row.id} /> : null}
          </li>
        ))}
        {!records.length ? <li className="text-bark">No mottos yet.</li> : null}
      </ul>
    </AppShell>
  );
}
