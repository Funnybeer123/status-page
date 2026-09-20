export function SearchBox({ defaultQuery = "" }: { defaultQuery?: string }) {
  return (
    <form action="/search" className="flex items-center gap-2">
      <input
        name="q"
        defaultValue={defaultQuery}
        placeholder="Search the archive"
        aria-label="Search the archive"
        data-testid="archive-search"
        className="w-40 rounded-full border border-bark/15 bg-paper px-3 py-1.5 font-sans text-sm sm:w-52"
      />
      <button type="submit" className="font-sans text-xs uppercase tracking-wide text-gold hover:text-seal">
        Search
      </button>
    </form>
  );
}
