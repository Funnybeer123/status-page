import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ImportForm } from "@/app/import/ui";
import { RestoreForm } from "@/app/import/restore";
import { requireFamily } from "@/lib/family";
import { canWrite } from "@/lib/roles";

export default async function ImportPage() {
  const ctx = await requireFamily();
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="import-heading">Import and export</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Bring a GEDCOM from another program, or take this family out as GEDCOM or a whole-archive JSON file.
      </p>
      <div className="mt-6 flex flex-wrap gap-3 font-sans text-sm">
        <a href="/api/gedcom" className="rounded-full bg-seal px-4 py-2 text-cream">Download GEDCOM</a>
        <a href="/api/export" className="rounded-full border border-bark/20 px-4 py-2">Whole-archive JSON</a>
        <a href="/api/export?format=bundle" className="rounded-full border border-bark/20 px-4 py-2">JSON with media</a>
        <Link href="/export" className="rounded-full border border-bark/20 px-4 py-2">Export page</Link>
      </div>
      {canWrite(ctx.role) ? (
        <>
          <ImportForm />
          <RestoreForm />
        </>
      ) : (
        <p className="mt-8 text-bark">Viewers can download, but cannot import.</p>
      )}
    </AppShell>
  );
}
