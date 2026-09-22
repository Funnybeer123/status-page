import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingCaptionsHeading } from "@/lib/filmCaptions";

export default async function MissingCaptionsPage() {
  const ctx = await requireFamily();
  const films = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: "video" },
    include: { filmCaptions: true },
    orderBy: { title: "asc" },
  });
  const missing = films.filter((film) => !film.filmCaptions.length);
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="missing-captions-heading">
        {missingCaptionsHeading(missing.length)}
      </h1>
      <ul className="mt-8 space-y-3" data-testid="missing-captions">
        {missing.map((film) => (
          <li key={film.id} className="paper-card p-4">
            <Link href={`/films/${film.id}/captions`} className="font-display text-xl text-seal">
              {film.title || "Untitled film"}
            </Link>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">{missingCaptionsHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
