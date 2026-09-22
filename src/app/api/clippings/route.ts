import { NextResponse } from "next/server";
import { DocKind, Role } from "@prisma/client";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { saveFamilyDocument } from "@/lib/documents";
import { notifyFollowers } from "@/lib/follows";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const clippings = await prisma.document.findMany({
    where: { familyId: ctx.family.id, kind: DocKind.clipping },
    include: { people: { include: { person: true } }, asset: true },
    orderBy: { writtenAt: "desc" },
  });
  return NextResponse.json({ clippings });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const form = await req.formData();
  const title = String(form.get("title") || "").trim();
  if (!title) return NextResponse.json({ error: "A headline is required." }, { status: 400 });
  const personIds = String(form.get("personIds") || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const file = form.get("file");
  const saved = await saveFamilyDocument({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    title,
    kind: DocKind.clipping,
    transcript: String(form.get("transcript") || ""),
    writtenAt: String(form.get("writtenAt") || ""),
    personIds,
    file: file instanceof File ? file : null,
  });
  await notifyFollowers({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    personIds,
    kind: "letter",
    title,
    entityId: saved.document.id,
  });
  return NextResponse.json(saved);
}
