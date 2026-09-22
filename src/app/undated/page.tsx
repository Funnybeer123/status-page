import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";

export default async function UndatedPage() {
  const ctx = await requireFamily();
  const assets = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, capturedAt: null },
    include: { tags: { include: { person: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="undated-heading">Undated photographs</h1>
      <p className="mt-3 max-w-2xl text-bark">Pictures without a year. A relative can still name the faces and guess the decade later.</p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2" data-testid="undated-list">
        {assets.map((asset) => (
          <li key={asset.id} className="paper-card overflow-hidden">
            <Link href={`/archive/${asset.id}`}>
              {asset.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/media/${asset.storagePath}`} alt={asset.title ?? ""} className="aspect-video w-full object-cover" />
              ) : (
                <p className="p-5">{asset.title}</p>
              )}
              <p className="p-4 font-display text-xl">{asset.title || "Untitled"}</p>
              <p className="px-4 pb-4 font-sans text-sm text-gold">
                {asset.tags.map((tag) => tag.person.displayName).join(", ") || "Untagged"}
              </p>
            </Link>
          </li>
        ))}
        {!assets.length ? <li className="text-bark">Every photograph has a date.</li> : null}
      </ul>
    </AppShell>
  );
}
