import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hasPostmark, undatedWrittenHeading } from "@/lib/postmark";

export default async function UndatedWrittenPostmarksPage() {
  const ctx = await requireFamily();
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] } },
    orderBy: { title: "asc" },
  });
  const items = letters.filter((letter) => hasPostmark(letter) && !letter.writtenAt);
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="undated-written-heading">
        {undatedWrittenHeading(items.length)}
      </h1>
      <ul className="mt-8 space-y-3" data-testid="undated-written">
        {items.map((letter) => (
          <li key={letter.id}>
            <Link href={`/letters/${letter.id}`} className="text-seal">{letter.title}</Link>
          </li>
        ))}
        {!items.length ? <li className="text-bark">{undatedWrittenHeading(0)}</li> : null}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href="/letters/postmarks" className="text-seal">All postmarks</Link>
      </p>
    </AppShell>
  );
}
