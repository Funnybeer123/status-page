import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { hideResidenceForViewer } from "@/lib/privacy";
import { compareResidencePoints, residenceCompareHeading, sortResidences } from "@/lib/residenceMap";
import { placeLabel } from "@/lib/places";

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const params = new URL(req.url).searchParams;
  const aId = params.get("a") || "";
  const bId = params.get("b") || "";
  if (!aId || !bId || aId === bId) {
    return NextResponse.json({ error: "Choose two people to compare." }, { status: 400 });
  }
  const people = await prisma.person.findMany({
    where: { id: { in: [aId, bId] }, familyId: ctx.family.id, deletedAt: null },
    include: { residences: { include: { place: true } } },
  });
  const a = people.find((person) => person.id === aId);
  const b = people.find((person) => person.id === bId);
  if (!a || !b) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const rows = [a, b].flatMap((person) => {
    if (hideResidenceForViewer(ctx.role, person)) return [];
    return sortResidences(person.residences).map((row) => ({
      personId: person.id,
      personName: person.displayName,
      placeName: placeLabel(row.place),
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      when: formatDate(row.startedAt, "Undated"),
      latitude: row.place.latitude,
      longitude: row.place.longitude,
      gps: row.place.gps,
    }));
  });
  const points = compareResidencePoints(rows);
  return NextResponse.json({
    heading: residenceCompareHeading(a.displayName, b.displayName),
    a: { id: a.id, displayName: a.displayName },
    b: { id: b.id, displayName: b.displayName },
    residences: rows,
    points,
  });
}
