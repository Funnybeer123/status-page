import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ClippingForm } from "@/app/clippings/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { canWrite } from "@/lib/roles";
import { DocKind } from "@prisma/client";
import { clippingPageHeading, clippingPageLine } from "@/lib/clippingPage";

export default async function ClippingsPage() {
  const ctx = await requireFamily();
  const [people, clippings] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id }, orderBy: { displayName: "asc" } }),
    prisma.document.findMany({
      where: { familyId: ctx.family.id, kind: DocKind.clipping },
      include: { people: { include: { person: true } }, asset: true },
      orderBy: { writtenAt: "desc" },
    }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="clippings-heading">Newspaper clippings</h1>
      <p className="mt-3 max-w-2xl text-bark">A scan, a date, a transcript, and the people named in the notice.</p>
      {canWrite(ctx.role) ? (
        <ClippingForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="clippings-list">
        {clippings.map((clipping) => (
          <li key={clipping.id} className="paper-card overflow-hidden p-5">
            <Link href={`/letters/${clipping.id}`} className="font-display text-2xl text-seal">{clipping.title}</Link>
            <p className="font-sans text-sm text-bark">
              {formatDate(clipping.writtenAt, "Undated")}
              {clipping.people.length ? ` · ${clipping.people.map((item) => item.person.displayName).join(", ")}` : ""}
            </p>
            {clipping.asset ? (
              <figure className="mt-4" data-testid="clipping-page">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/media/${clipping.asset.storagePath}`}
                  alt={clippingPageLine(clipping.asset.title)}
                  className="w-full bg-cream"
                />
                <figcaption className="mt-2 font-sans text-sm text-gold">
                  {clippingPageHeading(clipping.title)}
                </figcaption>
              </figure>
            ) : null}
          </li>
        ))}
        {!clippings.length ? <li className="text-bark">No clippings yet.</li> : null}
      </ul>
    </AppShell>
  );
}
