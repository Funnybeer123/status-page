import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";

export default async function CapsulePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const capsule = await prisma.timeCapsule.findFirst({
    where: {
      familyId: ctx.family.id,
      OR: [{ id }, { documentId: id }],
    },
    include: {
      document: { include: { people: { include: { person: true } } } },
      addressee: true,
      fromPerson: true,
    },
  });
  if (!capsule) notFound();
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Time capsule</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="capsule-title">{capsule.document.title}</h1>
      <p className="mt-3 text-bark" data-testid="capsule-for">
        Addressed to {capsule.addresseeName}
        {capsule.addressee ? (
          <>
            {" · "}
            <Link href={`/people/${capsule.addressee.id}`} className="text-seal">{capsule.addressee.displayName}</Link>
          </>
        ) : null}
        {capsule.fromPerson ? ` · from ${capsule.fromPerson.displayName}` : ""}
      </p>
      <p className="font-sans text-sm text-gold">Open {formatDate(capsule.openOn)}</p>
      <article className="paper-card mt-8 whitespace-pre-wrap p-6 text-lg leading-relaxed" data-testid="capsule-body">
        {capsule.document.transcript}
      </article>
      <p className="mt-6 font-sans text-sm">
        <Link href="/ask" className="text-seal">Find this letter in Ask</Link>
        {" · "}
        <Link href="/capsules" className="text-seal">All capsules</Link>
      </p>
    </AppShell>
  );
}
