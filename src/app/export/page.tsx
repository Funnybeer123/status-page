import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";

export default async function ExportPage() {
  const ctx = await requireFamily();
  const [people, documents, assets, stories] = await Promise.all([
    prisma.person.count({ where: { familyId: ctx.family.id } }),
    prisma.document.count({ where: { familyId: ctx.family.id } }),
    prisma.asset.count({ where: { familyId: ctx.family.id } }),
    prisma.story.count({ where: { familyId: ctx.family.id } }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="export-heading">Whole-archive export</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Take people, places, letters, stories, comments, and albums as JSON, or a GEDCOM for another program.
      </p>
      <ul className="paper-card mt-8 space-y-2 p-5" data-testid="export-counts">
        <li>{people} people</li>
        <li>{documents} letters and notes</li>
        <li>{assets} photographs, films, and oral histories</li>
        <li>{stories} stories</li>
      </ul>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href="/api/export" className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream">Download JSON</a>
        <a href="/api/export?format=gedcom" className="rounded-full border border-bark/20 px-4 py-2 font-sans text-sm">Download GEDCOM</a>
        <a href="/api/export?format=bundle" className="rounded-full border border-bark/20 px-4 py-2 font-sans text-sm">JSON with media</a>
      </div>
    </AppShell>
  );
}
