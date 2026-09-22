import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { boxSocialLine, boxSocialsHeading, compileSocials } from "@/lib/boxSocial";
import { parseDate } from "@/lib/parse";

const schema = z.object({
  buyerId: z.string(),
  sellerId: z.string(),
  heldOn: z.string().optional(),
  price: z.string().max(40).optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = compileSocials(
    (await prisma.boxSocial.findMany({
      where: { familyId: ctx.family.id },
      include: { buyer: true, seller: true },
    })).map((row) => ({
      id: row.id,
      buyer: row.buyer.displayName,
      seller: row.seller.displayName,
      heldOn: row.heldOn,
      price: row.price,
    })),
  );
  return NextResponse.json({ socials: rows, heading: boxSocialsHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Who bought whose box?" }, { status: 400 });
  const [buyer, seller] = await Promise.all([
    prisma.person.findFirst({ where: { id: body.data.buyerId, familyId: ctx.family.id, deletedAt: null } }),
    prisma.person.findFirst({ where: { id: body.data.sellerId, familyId: ctx.family.id, deletedAt: null } }),
  ]);
  if (!buyer || !seller) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const row = await prisma.boxSocial.create({
    data: {
      familyId: ctx.family.id,
      buyerId: buyer.id,
      sellerId: seller.id,
      heldOn: parseDate(body.data.heldOn),
      price: body.data.price?.trim() || null,
      notes: body.data.notes?.trim() || null,
    },
    include: { buyer: true, seller: true },
  });
  const line = boxSocialLine(row.buyer.displayName, row.seller.displayName, row.price);
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "social",
    entityId: row.id,
    title: line,
    summary: line,
  });
  return NextResponse.json({ social: row, line });
}
