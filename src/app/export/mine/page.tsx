import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { mineExportFilename, mineExportHeading } from "@/lib/mineExport";

export default async function MineExportPage() {
  const ctx = await requireFamily();
  const userId = ctx.session.user.id;
  const [uploads, journals, revisions, meetings, transcripts] = await Promise.all([
    prisma.asset.count({ where: { familyId: ctx.family.id, uploadedById: userId, deletedAt: null } }),
    prisma.journalEntry.count({ where: { familyId: ctx.family.id, authorId: userId } }),
    prisma.documentRevision.count({ where: { editedById: userId, document: { familyId: ctx.family.id } } }),
    prisma.familyMeeting.count({ where: { familyId: ctx.family.id, createdById: userId } }),
    prisma.document.count({ where: { familyId: ctx.family.id, transcribedById: userId, deletedAt: null } }),
  ]);
  const count = uploads + journals + revisions + meetings + transcripts;
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="mine-export-heading">
        {mineExportHeading(count)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        A download of everything you added — photographs, journals, meeting notes, and transcripts you finished.
      </p>
      <p className="mt-6 font-sans text-sm text-gold">
        {uploads} uploads · {journals} journal entries · {meetings} meetings · {transcripts} transcripts
      </p>
      <a
        href="/api/export/mine"
        className="mt-8 inline-block rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream"
        data-testid="mine-export-link"
      >
        Download {mineExportFilename(ctx.session.user.name || "relative")}
      </a>
    </AppShell>
  );
}
