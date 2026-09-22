import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";

export default async function HymnsPage() {
  const ctx = await requireFamily();
  const hymns = await prisma.familyHymn.findMany({
    where: { familyId: ctx.family.id },
    orderBy: { title: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="hymns-heading">Family hymns</h1>
      <p className="mt-3 max-w-2xl text-bark">Songs the family still sings at funerals, weddings, and Sunday supper.</p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="hymn"
          action="/api/later-records"
          testId="hymn-form"
          submit="Add the hymn"
          fields={[
            { name: "title", placeholder: "Abide with Me", required: true },
            { name: "verse", placeholder: "A verse they kept" },
            { name: "occasion", placeholder: "Funerals, harvest" },
            { name: "notes", placeholder: "Notes" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="hymns-list">
        {hymns.map((hymn) => (
          <li key={hymn.id} className="paper-card p-5">
            <p className="font-display text-2xl">{hymn.title}</p>
            {hymn.occasion ? <p className="font-sans text-sm text-gold">{hymn.occasion}</p> : null}
            {hymn.verse ? <p className="mt-2 text-bark">{hymn.verse}</p> : null}
          </li>
        ))}
        {!hymns.length ? <li className="text-bark">No hymns yet.</li> : null}
      </ul>
    </AppShell>
  );
}
