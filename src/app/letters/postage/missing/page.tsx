import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingPostageHeading } from "@/lib/postage";

export default async function MissingPostagePage() {
  const ctx = await requireFamily();
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] }, postage: null },
    orderBy: { title: "asc" },
  });
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="missing-postage-heading">
        {missingPostageHeading(letters.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-postage-list">
        {letters.map((letter) => (
          <li key={letter.id} className="paper-card p-5">
            <Link href={`/letters/${letter.id}`} className="font-display text-2xl text-seal">
              {letter.title}
            </Link>
          </li>
        ))}
        {!letters.length ? <li className="text-bark">{missingPostageHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
