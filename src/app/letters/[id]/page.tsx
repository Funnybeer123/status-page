import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { LetterEditor } from "@/app/letters/[id]/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { canWrite } from "@/lib/roles";

export default async function LetterPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const letter = await prisma.document.findFirst({
    where: { id, familyId: ctx.family.id },
    include: { asset: true, people: { include: { person: true } } },
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
    </AppShell>
  );
}
