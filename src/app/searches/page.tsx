import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { SavedSearchForm } from "@/app/path/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { savedSearchHeading, savedSearchHref } from "@/lib/savedSearch";

export default async function SearchesPage() {
  const ctx = await requireFamily();
  const searches = await prisma.savedSearch.findMany({
    where: { familyId: ctx.family.id, userId: ctx.session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="searches-heading">Saved searches</h1>
      <p className="mt-3 max-w-2xl text-bark">{savedSearchHeading(searches.length)}. Reopen a hunt without typing it again.</p>
      {canWrite(ctx.role) ? <SavedSearchForm /> : null}
      <ul className="mt-10 space-y-3" data-testid="searches-list">
        {searches.map((search) => (
          <li key={search.id} className="paper-card p-5">
            <Link href={savedSearchHref(search.query, search.href)} className="font-display text-2xl text-seal">
              {search.title}
            </Link>
            <p className="text-bark">{search.query}</p>
          </li>
        ))}
        {!searches.length ? <li className="text-bark">No saved searches yet.</li> : null}
      </ul>
    </AppShell>
  );
}
