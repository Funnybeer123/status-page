import Link from "next/link";
import { DocKind } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { ObituaryForm } from "@/app/obituaries/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { canWrite } from "@/lib/roles";
import { ObituaryPortraitForm } from "@/app/ask-save/ui";
import { obituaryPortraitHeading } from "@/lib/obituaryPortrait";

export default async function ObituariesPage() {
  const ctx = await requireFamily();
  const [people, obituaries, assets] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id }, orderBy: { displayName: "asc" } }),
    prisma.document.findMany({
      where: { familyId: ctx.family.id, kind: DocKind.obituary },
      include: { people: { include: { person: true } }, memorialPerson: true },
      orderBy: { writtenAt: "desc" },
    }),
    prisma.asset.findMany({ where: { familyId: ctx.family.id, deletedAt: null } }),
  ]);
  const portraitById = new Map(assets.map((asset) => [asset.id, asset]));
  const deceased = people.filter((person) => person.deathDate);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="obituaries-heading">Obituaries</h1>
      <p className="mt-3 max-w-2xl text-bark">
        The notice the paper printed, dated and tied to the person it remembers.{" "}
        <Link href="/obituaries/missing" className="text-seal">Obituaries missing a portrait</Link>.
      </p>
      {canWrite(ctx.role) ? (
        <ObituaryForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="obituaries-list">
        {obituaries.map((item) => {
          const portrait = item.memorialPerson?.profileAssetId
            ? portraitById.get(item.memorialPerson.profileAssetId)
            : null;
          return (
            <li key={item.id} className="paper-card p-5">
              <Link href={`/letters/${item.id}`} className="font-display text-2xl text-seal">{item.title}</Link>
              <p className="font-sans text-sm text-bark">
                {formatDate(item.writtenAt, "Undated")}
                {item.people.length ? ` · ${item.people.map((link) => link.person.displayName).join(", ")}` : ""}
              </p>
              {item.memorialPerson && portrait ? (
                <figure className="mt-4" data-testid="obituary-portrait">
                  <Link href={`/people/${item.memorialPerson.id}/memorial`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/media/${portrait.storagePath}`}
                      alt={obituaryPortraitHeading(item.memorialPerson.displayName)}
                      className="aspect-square w-40 object-cover"
                    />
                    <figcaption className="mt-2 font-sans text-sm text-gold">
                      {obituaryPortraitHeading(item.memorialPerson.displayName)}
                    </figcaption>
                  </Link>
                </figure>
              ) : canWrite(ctx.role) ? (
                <ObituaryPortraitForm
                  documentId={item.id}
                  people={deceased.map((person) => ({ id: person.id, displayName: person.displayName }))}
                />
              ) : null}
            </li>
          );
        })}
        {!obituaries.length ? <li className="text-bark">No obituaries yet.</li> : null}
      </ul>
    </AppShell>
  );
}
