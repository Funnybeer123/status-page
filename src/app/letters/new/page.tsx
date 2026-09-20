import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { LetterForm } from "@/app/letters/new/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";

export default async function LettersNewPage() {
  const ctx = await requireFamily();
  const [people, letters] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id }, orderBy: { displayName: "asc" } }),
    prisma.document.findMany({
      where: { familyId: ctx.family.id, kind: { in: ["letter", "note"] } },
      orderBy: { writtenAt: "desc" },
    }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Correspondence</p>
      <h1 className="mt-2 font-display text-4xl">Letters</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Upload a scan, run OCR, then keep the image beside an editable transcript. Handwriting will need a human pass.
      </p>
      <LetterForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      <ul className="mt-10 space-y-3">
        {letters.map((letter) => (
          <li key={letter.id} className="paper-card p-4">
            <Link href={`/letters/${letter.id}`} className="font-display text-xl text-seal">
              {letter.title}
            </Link>
            <p className="font-sans text-sm text-bark">{formatDate(letter.writtenAt, "Undated")} · {letter.kind}</p>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
