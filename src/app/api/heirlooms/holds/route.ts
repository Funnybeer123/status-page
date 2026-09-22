import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { alive } from "@/lib/alive";
import { holdLine, provenanceHeading, sortHolds } from "@/lib/provenance";
import { formatDate } from "@/lib/dates";

const schema = z.object({
  heirloomId: z.string(),
  personId: z.string(),
  heldFrom: z.string().optional().nullable(),
  heldUntil: z.string().optional().nullable(),
  note: z.string().max(800).optional(),
});

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const heirloomId = new URL(req.url).searchParams.get("heirloomId");
  if (!heirloomId) return NextResponse.json({ error: "Choose an heirloom." }, { status: 400 });
  const heirloom = await prisma.heirloom.findFirst({
    where: { id: heirloomId, familyId: ctx.family.id },
    include: { holds: { include: { person: true } }, person: true },
  });
  if (!heirloom) return NextResponse.json({ error: "Heirloom not found." }, { status: 404 });
  const holds = sortHolds(heirloom.holds);
  return NextResponse.json({
    heirloom,
    holds,
    heading: provenanceHeading(heirloom.title, holds.length),
    lines: holds.map((hold) =>
      holdLine(hold.person.displayName, formatDate(hold.heldFrom, ""), formatDate(hold.heldUntil, "") || null),
    ),
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Say who held the heirloom." }, { status: 400 });
  const [heirloom, person] = await Promise.all([
    prisma.heirloom.findFirst({ where: { id: body.data.heirloomId, familyId: ctx.family.id } }),
    prisma.person.findFirst({ where: { id: body.data.personId, familyId: ctx.family.id, ...alive } }),
  ]);
  if (!heirloom || !person) return NextResponse.json({ error: "That heirloom or person is not in this family." }, { status: 404 });
  const hold = await prisma.heirloomHold.create({
    data: {
      heirloomId: heirloom.id,
      personId: person.id,
      heldFrom: body.data.heldFrom ? new Date(body.data.heldFrom) : null,
      heldUntil: body.data.heldUntil ? new Date(body.data.heldUntil) : null,
      note: body.data.note?.trim() || null,
    },
    include: { person: true, heirloom: true },
  });
  await prisma.heirloom.update({
    where: { id: heirloom.id },
    data: { personId: body.data.heldUntil ? heirloom.personId : person.id },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "recorded",
    entityType: "heirloom-hold",
    entityId: hold.id,
    title: heirloom.title,
    summary: person.displayName,
  });
  const holds = await prisma.heirloomHold.findMany({
    where: { heirloomId: heirloom.id },
    include: { person: true },
  });
  return NextResponse.json({
    hold,
    heading: provenanceHeading(heirloom.title, holds.length),
    line: holdLine(person.displayName, formatDate(hold.heldFrom, ""), formatDate(hold.heldUntil, "") || null),
  });
}
