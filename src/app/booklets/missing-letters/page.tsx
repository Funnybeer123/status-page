import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { hideMinorDetails } from "@/lib/privacy";
import { missingLettersBookletHeading } from "@/lib/packetBooklet";

export default async function MissingLettersBookletsPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, ...alive },
    include: { documents: { include: { document: true } } },
    orderBy: { displayName: "asc" },
  });
  const missing = people
    .filter((person) => !hideMinorDetails(ctx.role, person))
    .filter(
      (person) =>
        !person.documents.some(
          (item) =>
            item.document &&
            !item.document.deletedAt &&
            (item.document.kind === "letter" || item.document.kind === "note"),
        ),
    );
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="missing-booklet-letters-heading">
        {missingLettersBookletHeading(missing.length)}
      </h1>
      <ul className="mt-8 space-y-3" data-testid="missing-booklet-letters">
        {missing.map((person) => (
          <li key={person.id}>
            <Link href={`/people/${person.id}/booklet`} className="text-seal">{person.displayName}</Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
