import { AppShell } from "@/components/AppShell";
import { ArchiveClient, BulkPhotoForm } from "@/app/archive/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatDate } from "@/lib/dates";

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const ctx = await requireFamily();
  const { year } = await searchParams;
  const [assets, people] = await Promise.all([
    prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: null },
      include: { tags: { include: { person: true } } },
      orderBy: [{ capturedAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const years = [
    ...new Set(
      assets
        .map((asset) => (asset.capturedAt ? asset.capturedAt.getUTCFullYear() : null))
        .filter((value): value is number => Boolean(value)),
    ),
  ].sort((a, b) => b - a);
  const visible = year ? assets.filter((asset) => asset.capturedAt?.getUTCFullYear() === Number(year)) : assets;

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
          <h1 className="mt-2 font-display text-4xl">Archive</h1>
          <p className="mt-3 max-w-xl text-bark">Photographs, films, letter scans, and oral-history audio, each with a date when we know it.</p>
        </div>
      </div>
      {canWrite(ctx.role) ? (
        <>
          <ArchiveClient people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
          <BulkPhotoForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
        </>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-2 font-sans text-sm">
        <a href="/archive" className={`rounded-full px-3 py-1 ${!year ? "bg-seal text-cream" : "border border-bark/15"}`}>All years</a>
        {years.map((item) => (
          <a key={item} href={`/archive?year=${item}`} className={`rounded-full px-3 py-1 ${year === String(item) ? "bg-seal text-cream" : "border border-bark/15"}`}>
            {item}
          </a>
        ))}
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((asset) => (
          <article key={asset.id} className="paper-card overflow-hidden">
            <a href={`/archive/${asset.id}`}>
            {asset.mimeType.startsWith("video/") ? (
              <video src={`/api/media/${asset.storagePath}`} className="aspect-[4/3] w-full bg-cedar object-cover" />
            ) : asset.mimeType.startsWith("audio/") || asset.kind === "audio" ? (
              <div className="flex aspect-[4/3] items-center justify-center bg-cedar/10 font-sans text-bark">Oral history</div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/media/${asset.storagePath}`} alt={asset.title ?? ""} className="aspect-[4/3] w-full object-cover" />
            )}
            </a>
            <div className="p-4">
              <p className="font-display text-lg"><a href={`/archive/${asset.id}`}>{asset.title}</a></p>
              <p className="mt-1 font-sans text-xs uppercase tracking-wide text-gold">{asset.kind} · {formatDate(asset.capturedAt)}</p>
              <p className="mt-2 font-sans text-sm text-bark">
                {asset.tags.map((tag) => tag.person.displayName).join(", ") || "Untagged"}
              </p>
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
