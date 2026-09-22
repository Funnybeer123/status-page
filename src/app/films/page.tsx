import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { FilmMomentForm } from "@/app/films/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { filmMomentLine, sortFilmMoments } from "@/lib/filmMoments";

export default async function FilmsPage() {
  const ctx = await requireFamily();
  const films = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: "video" },
    include: { filmMoments: true, tags: { include: { person: true } } },
    orderBy: { capturedAt: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="films-heading">Films</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Timestamped moments inside a home movie.{" "}
        <Link href="/films/captions/missing" className="text-seal">Silent caption tracks</Link>
      </p>
      <ul className="mt-10 space-y-6" data-testid="films-list">
        {films.map((film) => (
          <li key={film.id} className="paper-card p-5">
            <Link href={`/archive/${film.id}`} className="font-display text-2xl text-seal">{film.title || "Untitled film"}</Link>
            <p className="mt-2 font-sans text-sm">
              <Link href={`/films/${film.id}/captions`} className="text-seal">Silent captions</Link>
            </p>
            <ul className="mt-3 space-y-1" data-testid="film-moments">
              {sortFilmMoments(film.filmMoments).map((moment) => (
                <li key={moment.id} className="text-bark">{filmMomentLine(moment)}</li>
              ))}
              {!film.filmMoments.length ? <li className="text-bark">No moments marked yet.</li> : null}
            </ul>
            {canWrite(ctx.role) ? <FilmMomentForm assetId={film.id} /> : null}
          </li>
        ))}
        {!films.length ? <li className="text-bark">No films in the archive yet.</li> : null}
      </ul>
    </AppShell>
  );
}
