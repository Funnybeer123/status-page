import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { groupByUploader, uploadersHeading } from "@/lib/archiveUploaders";
import { formatDate } from "@/lib/dates";

export default async function ArchiveUploadersPage() {
  const ctx = await requireFamily();
  const assets = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    include: { uploadedBy: { select: { id: true, name: true } } },
    orderBy: [{ capturedAt: "desc" }, { createdAt: "desc" }],
  });
  const groups = groupByUploader(assets);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="uploaders-heading">{uploadersHeading(groups.length)}</h1>
      <p className="mt-3 max-w-2xl text-bark">The archive grouped by who uploaded each photograph or letter scan.</p>
      <div className="mt-10 space-y-8" data-testid="uploaders-list">
        {groups.map((group) => (
          <section key={group.name} className="paper-card p-5">
            <h2 className="font-display text-2xl">{group.heading}</h2>
            <ul className="mt-3 space-y-2">
              {group.items.map((asset) => (
                <li key={asset.id}>
                  <Link href={`/archive/${asset.id}`} className="text-seal">{asset.title || "Untitled"}</Link>
                  <span className="font-sans text-sm text-gold"> · {formatDate(asset.capturedAt, "")}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {!groups.length ? <p className="text-bark">No one has uploaded to the archive yet.</p> : null}
      </div>
      <p className="mt-8 font-sans text-sm">
        <Link href="/archive" className="text-seal">Archive by date</Link>
      </p>
    </AppShell>
  );
}
