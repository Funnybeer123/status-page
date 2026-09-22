import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { SpokenNameForm } from "@/app/firsts/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { hideMinorDetails } from "@/lib/privacy";
import { canWrite } from "@/lib/roles";
import { soundboardHeading, spokenNameLine } from "@/lib/soundboard";

export default async function SoundboardPage() {
  const ctx = await requireFamily();
  const [people, assets] = await Promise.all([
    prisma.person.findMany({
      where: { familyId: ctx.family.id, ...alive },
      orderBy: { displayName: "asc" },
    }),
    prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, kind: "audio" },
      select: { id: true, title: true, storagePath: true },
      orderBy: { title: "asc" },
    }),
  ]);
  const spokenIds = people.map((person) => person.pronunciationAssetId).filter((id): id is string => Boolean(id));
  const spokenAssets = spokenIds.length
    ? await prisma.asset.findMany({ where: { id: { in: spokenIds }, familyId: ctx.family.id, deletedAt: null } })
    : [];
  const byId = new Map(spokenAssets.map((asset) => [asset.id, asset]));
  const visible = people.filter((person) => !hideMinorDetails(ctx.role, person));
  const items = visible
    .map((person) => {
      const asset = person.pronunciationAssetId ? byId.get(person.pronunciationAssetId) : null;
      return {
        id: person.id,
        displayName: person.displayName,
        line: spokenNameLine(person.displayName, person.pronunciation),
        storagePath: asset?.storagePath || null,
      };
    })
    .filter((item) => item.storagePath);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="soundboard-heading">{soundboardHeading(items.length)}</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Short spoken names, so the family can hear how each one is said.{" "}
        <Link href="/spoken" className="text-seal">Spoken answers</Link>
        {" · "}
        <Link href="/soundboard/missing" className="text-seal">Names still needed</Link>
      </p>
      <ul className="mt-10 space-y-4" data-testid="soundboard-list">
        {items.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <Link href={`/people/${item.id}`} className="font-display text-2xl text-seal">{item.line}</Link>
            {item.storagePath ? (
              <audio controls src={`/api/media/${item.storagePath}`} className="mt-3 w-full" data-testid={`spoken-audio-${item.id}`} />
            ) : null}
          </li>
        ))}
        {!items.length ? <li className="text-bark">No spoken names on the soundboard yet.</li> : null}
      </ul>
      {canWrite(ctx.role) ? (
        <section className="mt-12">
          <h2 className="font-display text-2xl">Add a spoken name</h2>
          <ul className="mt-4 space-y-4">
            {visible.map((person) => (
              <li key={`form-${person.id}`}>
                <p className="font-sans text-sm text-gold">{person.displayName}</p>
                <SpokenNameForm personId={person.id} assets={assets} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </AppShell>
  );
}
