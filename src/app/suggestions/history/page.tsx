import Link from "next/link";
import { Role } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { suggestionHistoryHeading, suggestionLine } from "@/lib/suggestions";

export default async function SuggestionHistoryPage() {
  const ctx = await requireFamily();
  const suggestions = await prisma.factSuggestion.findMany({
    where: {
      familyId: ctx.family.id,
      status: { in: ["accepted", "dismissed"] },
      ...(ctx.role === Role.owner ? {} : { createdById: ctx.session.user.id }),
    },
    include: { person: true, reviewedBy: { select: { name: true } } },
    orderBy: { reviewedAt: "desc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">
        <Link href="/suggestions" className="text-seal">Corrections</Link>
      </p>
      <h1 className="mt-2 font-display text-4xl" data-testid="suggestion-history-heading">
        {suggestionHistoryHeading(suggestions.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="suggestion-history-list">
        {suggestions.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{row.person?.displayName || "Someone"}</p>
            <p className="text-bark">{suggestionLine({ name: row.person?.displayName, field: row.field, proposedValue: row.proposedValue })}</p>
            <p className="mt-2 font-sans text-sm text-gold">
              {row.status}
              {row.reviewedBy?.name ? ` · ${row.reviewedBy.name}` : ""}
            </p>
          </li>
        ))}
        {!suggestions.length ? <li className="text-bark">Nothing reviewed yet.</li> : null}
      </ul>
    </AppShell>
  );
}
