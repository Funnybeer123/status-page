import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { LetterEditor } from "@/app/letters/[id]/ui";
import { CommentThread } from "@/components/CommentThread";
import { TrashRestore } from "@/app/trash/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { canWrite } from "@/lib/roles";

export default async function LetterPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const letter = await prisma.document.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
    include: {
      asset: true,
      people: { include: { person: true } },
      comments: { include: { author: true } },
      revisions: { include: { editedBy: { select: { name: true } } }, orderBy: { editedAt: "desc" } },
    },
  });
  if (!letter) notFound();

  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{letter.kind}</p>
      <h1 className="mt-2 font-display text-4xl">{letter.title}</h1>
      <p className="mt-2 text-bark">
        {formatDate(letter.writtenAt, "Undated")}
        {letter.people.length ? ` · ${letter.people.map((item) => item.person.displayName).join(", ")}` : ""}
      </p>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="paper-card overflow-hidden p-4">
          {letter.asset ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/media/${letter.asset.storagePath}`} alt={letter.title} className="w-full bg-cream" />
          ) : (
            <p className="text-bark">This note has no scan — only the family&apos;s words.</p>
          )}
        </div>
        <LetterEditor
          id={letter.id}
          title={letter.title}
          transcript={letter.transcript}
          writtenAt={letter.writtenAt ? letter.writtenAt.toISOString().slice(0, 10) : ""}
          canEdit={canWrite(ctx.role)}
        />
      </div>
      {letter.revisions.length ? (
        <section className="mt-10" data-testid="transcript-history">
          <h2 className="font-display text-2xl">Earlier transcripts</h2>
          <ol className="mt-4 space-y-3">
            {letter.revisions.map((revision) => (
              <li key={revision.id} className="paper-card p-4">
                <p className="font-sans text-sm text-gold">
                  {revision.editedBy.name} · {formatDate(revision.editedAt)}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-bark">{revision.transcript}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {canWrite(ctx.role) ? <TrashRestore type="letter" id={letter.id} /> : null}
      <CommentThread comments={letter.comments} documentId={letter.id} canWrite={canWrite(ctx.role)} />
    </AppShell>
  );
}
