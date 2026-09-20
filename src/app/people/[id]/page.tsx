import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate, lifespan } from "@/lib/dates";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const person = await prisma.person.findFirst({
    where: { id, familyId: ctx.family.id },
    include: {
      tags: { include: { asset: true } },
      documents: { include: { document: true } },
      fromRels: { include: { toPerson: true } },
      toRels: { include: { fromPerson: true } },
    },
  });
  if (!person) notFound();
  const profile = person.profileAssetId
    ? await prisma.asset.findUnique({ where: { id: person.profileAssetId } })
    : null;

  return (
    <AppShell>
      <div className="grid gap-8 md:grid-cols-[280px_1fr]">
        <aside className="paper-card overflow-hidden">
          <div className="aspect-[4/5] bg-cedar/10">
            {profile ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/media/${profile.storagePath}`} alt={person.displayName} className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="p-5">
            <h1 className="font-display text-3xl">{person.displayName}</h1>
            <p className="mt-2 font-sans text-sm text-bark">{lifespan(person.birthDate, person.deathDate)}</p>
          </div>
        </aside>
        <section className="space-y-8">
          <div>
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Dates</p>
            <p className="mt-2">Born {formatDate(person.birthDate, "unknown")}{person.deathDate ? ` · Died ${formatDate(person.deathDate)}` : ""}</p>
          </div>
          {person.notes ? (
            <div>
              <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Notes</p>
              <p className="mt-2 max-w-2xl text-lg leading-relaxed">{person.notes}</p>
            </div>
          ) : null}
          <div>
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Family</p>
            <ul className="mt-3 space-y-2">
              {person.fromRels.map((rel) => (
                <li key={rel.id}>
                  {rel.type === "parent" ? "Parent of" : "Partner of"}{" "}
                  <Link className="text-seal" href={`/people/${rel.toPerson.id}`}>{rel.toPerson.displayName}</Link>
                </li>
              ))}
              {person.toRels.map((rel) => (
                <li key={rel.id}>
                  {rel.type === "parent" ? "Child of" : "Partner of"}{" "}
                  <Link className="text-seal" href={`/people/${rel.fromPerson.id}`}>{rel.fromPerson.displayName}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Letters and notes</p>
            <ul className="mt-3 space-y-2">
              {person.documents.map((item) => (
                <li key={item.documentId}>
                  <Link className="text-seal" href={`/letters/${item.documentId}`}>{item.document.title}</Link>
                  <span className="ml-2 font-sans text-xs text-bark">{formatDate(item.document.writtenAt, "")}</span>
                </li>
              ))}
              {!person.documents.length ? <li className="text-bark">None linked yet.</li> : null}
            </ul>
          </div>
          <div>
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">In the archive</p>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {person.tags.map((tag) => (
                <Link key={tag.id} href="/archive" className="paper-card overflow-hidden">
                  {tag.asset.mimeType.startsWith("video/") ? (
                    <video src={`/api/media/${tag.asset.storagePath}`} className="aspect-square w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/media/${tag.asset.storagePath}`} alt={tag.asset.title ?? ""} className="aspect-square w-full object-cover" />
                  )}
                  <p className="p-3 text-sm">{tag.asset.title}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
