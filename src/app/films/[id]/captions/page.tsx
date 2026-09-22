import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { FilmCaptionForm } from "@/app/memory-lane/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { filmCaptionLine, filmCaptionsHeading, sortFilmCaptions } from "@/lib/filmCaptions";

export default async function FilmCaptionsPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const film = await prisma.asset.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
    include: { filmCaptions: { include: { oralAsset: true } } },
  });
  if (!film) notFound();
  const orals = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: "audio" },
    orderBy: { title: "asc" },
  });
  const captions = sortFilmCaptions(film.filmCaptions.map((row) => ({ id: row.id, seconds: row.seconds, text: row.text })));
  const heading = filmCaptionsHeading(film.title);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="film-captions-heading">
        {heading}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Oral notes timed to the film, as a silent caption track.{" "}
        <Link href="/films" className="text-seal">
          Films
        </Link>
        {" · "}
        <Link href={`/archive/${film.id}`} className="text-seal">
          Open the film
        </Link>
        {" · "}
        <Link href="/films/captions/missing" className="text-seal">
          Films still without captions
        </Link>
      </p>
      <ol className="mt-10 space-y-3" data-testid="film-captions">
        {captions.map((caption) => (
          <li key={caption.id} className="paper-card p-5">
            <p className="font-display text-2xl">{filmCaptionLine(caption.seconds, caption.text)}</p>
          </li>
        ))}
        {!captions.length ? <li className="text-bark">No captions on this film yet.</li> : null}
      </ol>
      {canWrite(ctx.role) ? (
        <FilmCaptionForm
          filmId={film.id}
          orals={orals.map((oral) => ({ id: oral.id, title: oral.title || "Oral note" }))}
        />
      ) : null}
      <CiteBlock title={heading} path={`/films/${film.id}/captions`} />
    </AppShell>
  );
}
