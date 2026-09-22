import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { aloudParagraphs, readAloudHeading } from "@/lib/readAloud";

export default async function ReadAloudPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const letter = await prisma.document.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
  });
  if (!letter) notFound();
  const paragraphs = aloudParagraphs(letter.transcript);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Read aloud</p>
      <h1 className="mt-2 font-display text-5xl leading-tight" data-testid="read-aloud-heading">
        {readAloudHeading(letter.title)}
      </h1>
      <p className="mt-3 text-xl text-bark">{formatDate(letter.writtenAt, "Undated")}</p>
      <article className="paper-card mt-10 space-y-8 p-8" data-testid="read-aloud">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="text-3xl leading-relaxed">
            {paragraph}
          </p>
        ))}
        {!paragraphs.length ? <p className="text-3xl text-bark">This letter has no words to read yet.</p> : null}
      </article>
      <p className="mt-8 font-sans text-sm">
        <Link href={`/letters/${letter.id}`} className="text-seal">Back to the letter</Link>
        {" · "}
        <Link href={`/letters/${letter.id}/room`} className="text-seal">Reading room</Link>
      </p>
    </AppShell>
  );
}
