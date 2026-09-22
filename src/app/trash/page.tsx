import { AppShell } from "@/components/AppShell";
import { TrashRestore } from "@/app/trash/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";

export default async function TrashPage() {
  const ctx = await requireFamily();
  const [people, photos, letters] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: { not: null } }, orderBy: { displayName: "asc" } }),
    prisma.asset.findMany({ where: { familyId: ctx.family.id, deletedAt: { not: null } }, orderBy: { createdAt: "desc" } }),
    prisma.document.findMany({ where: { familyId: ctx.family.id, deletedAt: { not: null } }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="trash-heading">Trash</h1>
      <p className="mt-3 max-w-2xl text-bark">People, photographs, and letters a relative moved aside. Restore brings them back.</p>
      <section className="mt-10">
        <h2 className="font-display text-2xl">People</h2>
        <ul className="mt-4 space-y-2" data-testid="trash-people">
          {people.map((person) => (
            <li key={person.id} className="paper-card flex flex-wrap items-baseline justify-between gap-3 p-4">
              <span className="font-display text-xl">{person.displayName}</span>
              {canWrite(ctx.role) ? <TrashRestore type="person" id={person.id} restore /> : null}
            </li>
          ))}
          {!people.length ? <li className="text-bark">No people in the trash.</li> : null}
        </ul>
      </section>
      <section className="mt-10">
        <h2 className="font-display text-2xl">Photographs</h2>
        <ul className="mt-4 space-y-2" data-testid="trash-photos">
          {photos.map((asset) => (
            <li key={asset.id} className="paper-card flex flex-wrap items-baseline justify-between gap-3 p-4">
              <span>{asset.title || "Untitled"}</span>
              {canWrite(ctx.role) ? <TrashRestore type="photo" id={asset.id} restore /> : null}
            </li>
          ))}
          {!photos.length ? <li className="text-bark">No photographs in the trash.</li> : null}
        </ul>
      </section>
      <section className="mt-10">
        <h2 className="font-display text-2xl">Letters</h2>
        <ul className="mt-4 space-y-2" data-testid="trash-letters">
          {letters.map((document) => (
            <li key={document.id} className="paper-card flex flex-wrap items-baseline justify-between gap-3 p-4">
              <span>{document.title}</span>
              {canWrite(ctx.role) ? <TrashRestore type="letter" id={document.id} restore /> : null}
            </li>
          ))}
          {!letters.length ? <li className="text-bark">No letters in the trash.</li> : null}
        </ul>
      </section>
    </AppShell>
  );
}
