import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { mediaRoot } from "@/lib/media";
import { buildZip } from "@/lib/zip";
import { mineExportFilename, mineExportHeading, mineManifestLine } from "@/lib/mineExport";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const userId = ctx.session.user.id;
  const [assets, journals, revisions, meetings, activities, transcripts] = await Promise.all([
    prisma.asset.findMany({
      where: { familyId: ctx.family.id, uploadedById: userId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    }),
    prisma.journalEntry.findMany({
      where: { familyId: ctx.family.id, authorId: userId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.documentRevision.findMany({
      where: { editedById: userId, document: { familyId: ctx.family.id } },
      include: { document: { select: { title: true } } },
      orderBy: { editedAt: "asc" },
    }),
    prisma.familyMeeting.findMany({
      where: { familyId: ctx.family.id, createdById: userId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.activity.findMany({
      where: { familyId: ctx.family.id, actorId: userId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.document.findMany({
      where: { familyId: ctx.family.id, transcribedById: userId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const files: { name: string; data: Buffer }[] = [];
  const lines: string[] = [];
  for (const [index, asset] of assets.entries()) {
    lines.push(mineManifestLine("upload", asset.title || asset.storagePath));
    try {
      const bytes = await readFile(join(mediaRoot(), asset.storagePath));
      const ext = asset.storagePath.split(".").pop() || "bin";
      files.push({ name: `uploads/${String(index + 1).padStart(2, "0")}-${asset.title || "upload"}.${ext}`.replace(/[^\w./-]+/g, "-"), data: bytes });
    } catch {
      files.push({
        name: `uploads/${String(index + 1).padStart(2, "0")}-missing.txt`,
        data: Buffer.from(`${asset.title || "upload"} was not on this machine.\n`, "utf8"),
      });
    }
  }
  for (const [index, entry] of journals.entries()) {
    lines.push(mineManifestLine("journal", entry.title));
    files.push({
      name: `journals/${String(index + 1).padStart(2, "0")}-${entry.title || "journal"}.txt`.replace(/[^\w./-]+/g, "-"),
      data: Buffer.from(`${entry.title}\n\n${entry.body}\n`, "utf8"),
    });
  }
  for (const [index, revision] of revisions.entries()) {
    lines.push(mineManifestLine("revision", revision.document.title));
    files.push({
      name: `revisions/${String(index + 1).padStart(2, "0")}-${revision.document.title}.txt`.replace(/[^\w./-]+/g, "-"),
      data: Buffer.from(revision.transcript, "utf8"),
    });
  }
  for (const [index, meeting] of meetings.entries()) {
    lines.push(mineManifestLine("meeting", meeting.title));
    files.push({
      name: `meetings/${String(index + 1).padStart(2, "0")}-${meeting.title}.txt`.replace(/[^\w./-]+/g, "-"),
      data: Buffer.from(`${meeting.title}\n\n${meeting.notes}\n`, "utf8"),
    });
  }
  for (const [index, letter] of transcripts.entries()) {
    lines.push(mineManifestLine("transcript", letter.title));
    files.push({
      name: `transcripts/${String(index + 1).padStart(2, "0")}-${letter.title}.txt`.replace(/[^\w./-]+/g, "-"),
      data: Buffer.from(`${letter.title}\n\n${letter.transcript}\n`, "utf8"),
    });
  }
  lines.push(...activities.map((row) => mineManifestLine(row.verb, row.title)));
  files.unshift({
    name: "manifest.txt",
    data: Buffer.from(`${mineExportHeading(lines.length)}\n\n${lines.join("\n")}\n`, "utf8"),
  });
  const zip = buildZip(files);
  const filename = mineExportFilename(ctx.session.user.name || "relative");
  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
