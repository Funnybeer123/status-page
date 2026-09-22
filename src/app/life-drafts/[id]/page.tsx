import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { lifeDraftAskQuestion, lifeDraftHeading } from "@/lib/lifeDraft";
import { LifeDraftForm } from "@/app/funeral/ui";

export default async function LifeDraftPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const person = await prisma.person.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) notFound();
  const draft = await prisma.lifeDraft.findUnique({
    where: { familyId_personId: { familyId: ctx.family.id, personId: person.id } },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Life story draft</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="life-draft-heading">{lifeDraftHeading(person.displayName)}</h1>
      <p className="mt-3 max-w-2xl text-bark">{lifeDraftAskQuestion(person.displayName)}</p>
      {canWrite(ctx.role) ? (
        <LifeDraftForm personId={person.id} title={draft?.title || lifeDraftHeading(person.displayName)} body={draft?.body || ""} />
      ) : null}
      {draft?.body ? (
        <article className="paper-card mt-8 whitespace-pre-wrap p-5 text-lg leading-relaxed text-bark" data-testid="life-draft-body">
          {draft.body}
        </article>
      ) : null}
      <p className="mt-8 font-sans text-sm">
        <Link href={`/people/${person.id}`} className="text-seal">The record</Link>
        {" · "}
        <Link href="/life-drafts" className="text-seal">All drafts</Link>
        {" · "}
        <Link href="/ask" className="text-seal">Ask</Link>
      </p>
    </AppShell>
  );
}
