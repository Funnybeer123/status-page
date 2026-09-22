import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { PlaceNameForm } from "@/app/alive-when/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compilePlaceNames, placeNamesHeading } from "@/lib/placeNames";

export default async function PlaceNamesPage() {
  const ctx = await requireFamily();
  const [rows, places] = await Promise.all([
    prisma.placeName.findMany({
      where: { familyId: ctx.family.id },
      include: { place: true },
      orderBy: { name: "asc" },
    }),
    prisma.place.findMany({ where: { familyId: ctx.family.id }, orderBy: { name: "asc" } }),
  ]);
  const items = compilePlaceNames(rows);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="place-names-heading">
        {placeNamesHeading(items.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        How the family named a farm or a street.{" "}
        <Link href="/dictionary" className="text-seal">Family dictionary</Link>
        {" · "}
        <Link href="/places" className="text-seal">Places</Link>
        {" · "}
        <Link href="/places/names/missing" className="text-seal">Places without a family name</Link>
      </p>
      {canWrite(ctx.role) ? (
        <PlaceNameForm places={places.map((place) => ({ id: place.id, name: place.name }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="place-names-list">
        {items.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <Link href={`/places/${item.placeId}`} className="font-display text-2xl text-seal">
              {item.line}
            </Link>
            {item.notes ? <p className="text-bark">{item.notes}</p> : null}
          </li>
        ))}
        {!items.length ? <li className="text-bark">{placeNamesHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={placeNamesHeading(items.length)} path="/places/names" />
    </AppShell>
  );
}
