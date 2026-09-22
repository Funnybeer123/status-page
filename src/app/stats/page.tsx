import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { familyArchiveStats } from "@/lib/stats";
import { formatDate } from "@/lib/dates";

export default async function StatsPage() {
  const ctx = await requireFamily();
  const stats = await familyArchiveStats(ctx.family.id);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="stats-heading">Archive statistics</h1>
      <p className="mt-3 max-w-2xl text-bark">How much of this family is already written down.</p>
      <dl className="mt-10 grid gap-4 sm:grid-cols-2" data-testid="stats-grid">
        <div className="paper-card p-5">
          <dt className="font-sans text-sm text-gold">People</dt>
          <dd className="font-display text-3xl">{stats.people}</dd>
          <p className="text-bark">{stats.living} living · {stats.deceased} remembered</p>
        </div>
        <div className="paper-card p-5">
          <dt className="font-sans text-sm text-gold">Generations</dt>
          <dd className="font-display text-3xl">{stats.generations}</dd>
        </div>
        <div className="paper-card p-5">
          <dt className="font-sans text-sm text-gold">Oldest birth</dt>
          <dd className="font-display text-2xl">
            {stats.oldest ? <Link href={`/people/${stats.oldest.id}`} className="text-seal">{stats.oldest.displayName}</Link> : "—"}
          </dd>
          <p className="text-bark">{stats.oldest ? formatDate(stats.oldest.birthDate) : ""}</p>
        </div>
        <div className="paper-card p-5">
          <dt className="font-sans text-sm text-gold">Letters and notes</dt>
          <dd className="font-display text-3xl">{stats.letters}</dd>
        </div>
        <div className="paper-card p-5">
          <dt className="font-sans text-sm text-gold">Clippings</dt>
          <dd className="font-display text-3xl">{stats.clippings}</dd>
        </div>
        <div className="paper-card p-5">
          <dt className="font-sans text-sm text-gold">Recipes</dt>
          <dd className="font-display text-3xl">{stats.recipes}</dd>
        </div>
        <div className="paper-card p-5">
          <dt className="font-sans text-sm text-gold">Photographs</dt>
          <dd className="font-display text-3xl">{stats.photos}</dd>
        </div>
        <div className="paper-card p-5">
          <dt className="font-sans text-sm text-gold">Stories · albums · heirlooms</dt>
          <dd className="font-display text-3xl">{stats.stories} · {stats.albums} · {stats.heirlooms}</dd>
        </div>
      </dl>
    </AppShell>
  );
}
