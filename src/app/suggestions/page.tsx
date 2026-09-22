import Link from "next/link";
import { Role } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { SuggestionReview } from "@/app/attach/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { SUGGESTION_FIELDS, suggestionHeading, suggestionLine } from "@/lib/suggestions";

export default async function SuggestionsPage() {
  const ctx = await requireFamily();
  const [people, suggestions] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.factSuggestion.findMany({
      where: {
        familyId: ctx.family.id,
        status: "pending",
        ...(ctx.role === Role.owner ? {} : { createdById: ctx.session.user.id }),
      },
      include: { person: true, createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="suggestions-heading">
        {suggestionHeading(suggestions.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        A viewer can propose a correction. An owner accepts it onto the person, or dismisses it.
      </p>
      <p className="mt-3 font-sans text-sm">
        <Link href="/suggestions/history" className="text-seal">Already reviewed</Link>
      </p>
      <RecordForm
        kind="suggestion"
        action="/api/suggestions"
        testId="suggestion-form"
        submit="Propose a correction"
        fields={[
          { name: "personId", people: people.map((person) => ({ id: person.id, displayName: person.displayName })), label: "Who", required: true },
          { name: "field", label: "Which fact", options: SUGGESTION_FIELDS.map((field) => ({ id: field, label: field })) },
          { name: "proposedValue", placeholder: "What it should say", required: true },
          { name: "note", placeholder: "Why you think so" },
        ]}
      />
      <ul className="mt-10 space-y-3" data-testid="suggestions-list">
        {suggestions.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{row.person?.displayName || "Someone"}</p>
            <p className="text-bark">{suggestionLine({ name: row.person?.displayName, field: row.field, proposedValue: row.proposedValue })}</p>
            {row.note ? <p className="mt-2 text-bark">{row.note}</p> : null}
            <p className="mt-2 font-sans text-sm text-gold">From {row.createdBy.name || "a relative"}</p>
            {ctx.role === Role.owner ? <SuggestionReview id={row.id} /> : null}
          </li>
        ))}
        {!suggestions.length ? <li className="text-bark">No corrections waiting.</li> : null}
      </ul>
    </AppShell>
  );
}
