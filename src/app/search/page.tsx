import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { SearchBox } from "@/components/SearchBox";
import { SavedSearchForm } from "@/app/path/ui";
import { requireFamily } from "@/lib/family";
import { searchArchive } from "@/lib/search";
import { canWrite } from "@/lib/roles";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const ctx = await requireFamily();
  const { q = "" } = await searchParams;
  const results = await searchArchive(ctx.family.id, q, ctx.role);

  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="search-heading">Search the archive</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Names, maiden names, places, stories, letters, photographs, and life events — only this family’s.
      </p>
      <div className="mt-6">
        <SearchBox defaultQuery={q} />
      </div>
      {canWrite(ctx.role) && q.trim() ? <SavedSearchForm query={q} /> : null}
      <p className="mt-4 font-sans text-sm">
        <Link href="/searches" className="text-seal">Saved searches</Link>
      </p>
      <ul className="mt-10 space-y-4" data-testid="search-results">
        {results.hits.map((hit) => (
          <li key={`${hit.kind}-${hit.id}`} className="paper-card p-5">
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{hit.kind}</p>
            <Link href={hit.href} className="mt-1 block font-display text-2xl text-seal">{hit.title}</Link>
            {hit.excerpt ? <p className="mt-2 text-bark">{hit.excerpt}</p> : null}
          </li>
        ))}
        {q.trim().length >= 2 && !results.hits.length ? (
          <li className="text-bark">Nothing in this archive matches “{q}”.</li>
        ) : null}
        {q.trim().length < 2 ? <li className="text-bark">Type at least two letters.</li> : null}
      </ul>
    </AppShell>
  );
}
