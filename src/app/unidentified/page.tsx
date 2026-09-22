import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { unidentifiedPhotos } from "@/lib/moreFamily";
import { formatDate } from "@/lib/dates";

export default async function UnidentifiedPage() {
  const ctx = await requireFamily();
  const assets = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["photo", "video"] } },
    include: { tags: true },
    orderBy: { createdAt: "desc" },
  });
  const unknown = unidentifiedPhotos(assets);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="unidentified-heading">Unidentified photographs</h1>
      <p className="mt-3 max-w-2xl text-bark">Pictures nobody has named yet. A relative can tag the faces they still know.</p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2" data-testid="unidentified-list">
        {unknown.map((asset) => (
          <li key={asset.id} className="paper-card overflow-hidden">
            <Link href={`/archive/${asset.id}`}>
              {asset.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/media/${asset.storagePath}`} alt={asset.title ?? ""} className="aspect-video w-full object-cover" />
              ) : (
                <p className="p-5">{asset.title}</p>
              )}
              <p className="p-4 font-display text-xl">{asset.title || "Untitled"}</p>
              <p className="px-4 pb-4 font-sans text-sm text-bark">{formatDate(asset.capturedAt, "Undated")}</p>
            </Link>
          </li>
        ))}
        {!unknown.length ? <li className="text-bark">Every photograph has a name on it.</li> : null}
      </ul>
    </AppShell>
  );
}
