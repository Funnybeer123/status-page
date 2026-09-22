import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { isOralHistory, oralPlaylistHeading, playlistLine, sortOralPlaylist } from "@/lib/oralPlaylist";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const recordings = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    include: { tags: { include: { person: true } } },
    orderBy: { capturedAt: "asc" },
  });
  const items = sortOralPlaylist(recordings.filter(isOralHistory));
  return NextResponse.json({
    heading: oralPlaylistHeading(items.length),
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      capturedAt: item.capturedAt,
      when: formatDate(item.capturedAt, "Undated"),
      line: playlistLine(item.title, formatDate(item.capturedAt, "")),
      people: item.tags.map((tag) => tag.person.displayName),
      storagePath: item.storagePath,
      kind: item.kind,
    })),
  });
}
