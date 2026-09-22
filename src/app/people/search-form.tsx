export function PersonSearchForm({ personId, query = "" }: { personId: string; query?: string }) {
  return (
    <form action={`/people/${personId}/search`} method="get" className="mt-4 flex flex-wrap gap-2" data-testid="person-search">
      <input
        name="q"
        defaultValue={query}
        placeholder="Letters, stories, photographs"
        className="min-w-56 flex-1 rounded-lg border border-bark/15 bg-paper px-3 py-2"
      />
      <button className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Search this life
      </button>
    </form>
  );
}
