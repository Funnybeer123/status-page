import Link from "next/link";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { mediaRoot } from "@/lib/media";
import { compilePhotoDuplicates, emptyPhotoDuplicatesHeading, photoCrc, photoDuplicatesHeading } from "@/lib/photoDuplicates";

export default async function PhotoDuplicatesPage() {
  const ctx = await requireFamily();
  const photos = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, OR: [{ kind: "photo" }, { mimeType: { startsWith: "image/" } }] },
  });
  const items = [];
  for (const photo of photos) {
    let crc: string | null = null;
    try {
      crc = photoCrc(await readFile(join(mediaRoot(), photo.storagePath)));
    } catch {
      crc = null;
    }
    items.push({
      id: photo.id,
      title: photo.title,
      capturedAt: photo.capturedAt,
      mimeType: photo.mimeType,
      crc,
      href: `/archive/${photo.id}`,
    });
  }
  const groups = compilePhotoDuplicates(items);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="photo-duplicates-heading">
        {groups.length ? photoDuplicatesHeading(groups.length) : emptyPhotoDuplicatesHeading()}
      </h1>
      <p className="mt-3 text-bark">
        Near-identical photographs, grouped so a relative can keep the better scan.{" "}
        <Link href="/duplicates" className="text-seal">Possible people</Link>
        {" · "}
        <Link href="/photos/duplicates/empty" className="text-seal">Unique photographs</Link>
      </p>
      <div className="mt-10 space-y-8" data-testid="photo-duplicates-list">
        {groups.map((group) => (
          <section key={group.id} className="paper-card p-5">
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">
              {group.reason === "identical" ? "Same file" : "Same day and title"}
            </p>
            <ul className="mt-3 space-y-2">
              {group.items.map((item) => (
                <li key={item.id}>
                  <Link href={item.href || `/archive/${item.id}`} className="font-display text-xl text-seal">
                    {item.title || "Untitled photograph"}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {!groups.length ? <p className="text-bark">{emptyPhotoDuplicatesHeading()}</p> : null}
      </div>
      <CiteBlock title={photoDuplicatesHeading(groups.length)} path="/photos/duplicates" />
    </AppShell>
  );
}
