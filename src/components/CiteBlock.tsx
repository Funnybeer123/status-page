import { citeThisPage } from "@/lib/citePage";

export function CiteBlock({ title, path }: { title: string; path: string }) {
  const cite = citeThisPage({ title, url: path });
  return (
    <aside className="paper-card mt-10 p-5" data-testid="cite-this-page">
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{cite.heading}</p>
      <p className="mt-2 text-bark" data-testid="cite-this-line">{cite.line}</p>
      <p className="mt-2 font-sans text-sm text-gold">{cite.url}</p>
    </aside>
  );
}
