import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { checklistHeading, checklistItemLine, mergeUsualItems, uncheckedItemsHeading, usualDocumentTypes } from "@/lib/researchChecklist";

const schema = z.object({
  kind: z.string(),
  done: z.boolean().optional(),
});

async function ensureUsual(familyId: string) {
  const existing = await prisma.researchChecklistItem.findMany({ where: { familyId } });
  if (existing.length) return existing;
  await prisma.researchChecklistItem.createMany({
    data: usualDocumentTypes().map((item) => ({
      familyId,
      kind: item.kind,
      title: item.title,
    })),
  });
  return prisma.researchChecklistItem.findMany({ where: { familyId }, orderBy: { createdAt: "asc" } });
}

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const items = await ensureUsual(ctx.family.id);
  const merged = mergeUsualItems(items);
  const done = merged.filter((item) => item.doneAt).length;
  const unchecked = merged.filter((item) => !item.doneAt).length;
  return NextResponse.json({
    items: items.map((item) => ({
      ...item,
      line: checklistItemLine(item.title, Boolean(item.doneAt)),
    })),
    heading: checklistHeading(done, merged.length),
    uncheckedHeading: uncheckedItemsHeading(unchecked),
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose a document type on the checklist." }, { status: 400 });
  await ensureUsual(ctx.family.id);
  const usual = usualDocumentTypes().find((item) => item.kind === body.data.kind);
  const item = await prisma.researchChecklistItem.upsert({
    where: { familyId_kind: { familyId: ctx.family.id, kind: body.data.kind } },
    create: {
      familyId: ctx.family.id,
      kind: body.data.kind,
      title: usual?.title || body.data.kind,
      doneAt: body.data.done === false ? null : new Date(),
    },
    update: {
      doneAt: body.data.done === false ? null : new Date(),
    },
  });
  return NextResponse.json({ item, line: checklistItemLine(item.title, Boolean(item.doneAt)) });
}
