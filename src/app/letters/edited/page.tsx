import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { editedLettersHeading } from "@/lib/transcriptCompare";

export default async function EditedLettersPage() {
  const ctx = await requireFamily();
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, revisions: { some: {} } },
    include: { _count: { select: { revisions: true } } },
    orderBy: { title: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="edited-letters-heading">
        {editedLettersHeading(letters.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">Letters with an earlier transcript still on file.</p>
      <ul className="mt-10 space-y-3" data-testid="edited-letters-list">
        {letters.map((letter) => (
          <li key={letter.id} className="paper-card p-5">
            <Link href={`/letters/${letter.id}/compare`} className="font-display text-2xl text-seal">
              {letter.title}
            </Link>
            <p className="font-sans text-sm text-bark">{letter._count.revisions} earlier version{letter._count.revisions === 1 ? "" : "s"}</p>
          </li>
        ))}
        {!letters.length ? <li className="text-bark">No letters have been edited yet.</li> : null}
      </ul>
    </AppShell>
  );
}
