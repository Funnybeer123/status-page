import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileShopList, shopHeading, shopItemLine } from "@/lib/reunionShop";

const schema = z.object({
  reunionId: z.string(),
  label: z.string().min(1).max(160),
  quantity: z.number().int().min(1).max(9999).optional(),
  notes: z.string().max(400).optional(),
});

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const reunionId = new URL(req.url).searchParams.get("reunionId") || "";
  const reunion = await prisma.reunionGathering.findFirst({
    where: { id: reunionId, familyId: ctx.family.id },
    include: { shopItems: true },
  });
  if (!reunion) return NextResponse.json({ error: "Reunion not found." }, { status: 404 });
  const items = compileShopList(reunion.shopItems);
  return NextResponse.json({ heading: shopHeading(reunion.title, items.length), items });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Say what to bring to the hall." }, { status: 400 });
  const reunion = await prisma.reunionGathering.findFirst({
    where: { id: body.data.reunionId, familyId: ctx.family.id },
  });
  if (!reunion) return NextResponse.json({ error: "Reunion not found." }, { status: 404 });
  const item = await prisma.reunionShopItem.create({
    data: {
      familyId: ctx.family.id,
      reunionId: reunion.id,
      label: body.data.label.trim(),
      quantity: body.data.quantity ?? null,
      notes: body.data.notes?.trim() || null,
    },
  });
  return NextResponse.json({ item, line: shopItemLine(item.label, item.quantity) });
}
