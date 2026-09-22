import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { PotluckForm, RsvpButton, ReunionPhotoForm } from "@/app/reunions/ui";
import { compilePotluck } from "@/lib/potluck";
import { DocKind } from "@prisma/client";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatDate } from "@/lib/dates";

export default async function ReunionPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [reunion, assets, recipes, people] = await Promise.all([
    prisma.reunionGathering.findFirst({
      where: { id, familyId: ctx.family.id },
      include: {
        guests: { include: { person: true } },
        photos: { include: { asset: true } },
        dishes: { include: { person: true, recipe: true }, orderBy: { title: "asc" } },
      },
    }),
    prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, kind: "photo" },
      orderBy: { title: "asc" },
    }),
    prisma.document.findMany({
      where: { familyId: ctx.family.id, kind: DocKind.recipe, deletedAt: null },
      orderBy: { title: "asc" },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  if (!reunion) notFound();
  const coming = reunion.guests.filter((guest) => guest.coming);
  const notComing = reunion.guests.filter((guest) => !guest.coming);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Reunion</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="reunion-title">{reunion.title}</h1>
      <p className="mt-3 text-bark" data-testid="reunion-place">
        {formatDate(reunion.happenedOn)} · {reunion.place}
      </p>
      {reunion.notes ? <p className="mt-2 text-bark">{reunion.notes}</p> : null}
      <p className="mt-4 font-sans text-sm">
        <Link href={`/reunions/${reunion.id}/kiosk`} className="text-seal" data-testid="kiosk-link">
          Reunion kiosk
        </Link>
        {" · "}
        <Link href={`/reunions/${reunion.id}/tags`} className="text-seal" data-testid="name-tags-link">
          Printable name tags
        </Link>
      </p>
      <section className="mt-10">
        <h2 className="font-display text-3xl">Who’s coming</h2>
        <ul className="mt-4 space-y-2" data-testid="reunion-coming">
          {coming.map((guest) => (
            <li key={guest.personId} className="paper-card flex items-center justify-between p-4">
              <span>{guest.person.displayName}</span>
              {canWrite(ctx.role) ? <RsvpButton reunionId={reunion.id} personId={guest.personId} coming /> : null}
            </li>
          ))}
          {!coming.length ? <li className="text-bark">No one has said they are coming.</li> : null}
        </ul>
      </section>
      <section className="mt-10" data-testid="potluck">
        <h2 className="font-display text-3xl">Potluck</h2>
        <p className="mt-2 text-bark">Dishes tied to a cookbook recipe and to who is bringing them.</p>
        {canWrite(ctx.role) ? (
          <PotluckForm
            reunionId={reunion.id}
            people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
            recipes={recipes.map((recipe) => ({ id: recipe.id, title: recipe.title }))}
          />
        ) : null}
        <ul className="mt-4 space-y-2" data-testid="potluck-list">
          {compilePotluck(
            reunion.dishes.map((dish) => ({
              id: dish.id,
              title: dish.title,
              notes: dish.notes,
              personName: dish.person?.displayName ?? null,
              recipeTitle: dish.recipe?.title ?? null,
              recipeId: dish.recipeId,
            })),
          ).map((dish) => (
            <li key={dish.id} className="paper-card p-4">
              <p className="font-display text-xl">{dish.title}</p>
              <p className="text-bark">{dish.line}</p>
              {dish.recipeId ? (
                <Link href={`/letters/${dish.recipeId}`} className="font-sans text-sm text-seal">Cookbook recipe</Link>
              ) : null}
            </li>
          ))}
          {!reunion.dishes.length ? <li className="text-bark">No dishes listed yet.</li> : null}
        </ul>
      </section>
      <section className="mt-10">
        <h2 className="font-display text-3xl">Gallery</h2>
        {canWrite(ctx.role) ? (
          <ReunionPhotoForm
            reunionId={reunion.id}
            assets={assets.map((asset) => ({ id: asset.id, title: asset.title }))}
          />
        ) : null}
        <ul className="mt-4 grid gap-4 sm:grid-cols-2" data-testid="reunion-gallery">
          {reunion.photos.map((photo) => (
            <li key={photo.assetId} className="paper-card overflow-hidden">
              <Link href={`/archive/${photo.assetId}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/media/${photo.asset.storagePath}`} alt={photo.asset.title || ""} className="aspect-video w-full object-cover" />
                <p className="p-4 font-display text-xl">{photo.asset.title}</p>
              </Link>
            </li>
          ))}
          {!reunion.photos.length ? <li className="text-bark">No photographs tied to this reunion yet.</li> : null}
        </ul>
      </section>
      {notComing.length ? (
        <section className="mt-8">
          <h2 className="font-display text-3xl">Not coming</h2>
          <ul className="mt-4 space-y-2">
            {notComing.map((guest) => (
              <li key={guest.personId} className="paper-card flex items-center justify-between p-4">
                <span>{guest.person.displayName}</span>
                {canWrite(ctx.role) ? <RsvpButton reunionId={reunion.id} personId={guest.personId} coming={false} /> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </AppShell>
  );
}
