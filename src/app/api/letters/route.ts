import { NextResponse } from "next/server";
import { DocKind, Role } from "@prisma/client";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { parseDocKind, saveFamilyDocument } from "@/lib/documents";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, kind: { in: [DocKind.letter, DocKind.note] }, deletedAt: null },
    include: { people: { include: { person: true } }, asset: true },
    orderBy: { writtenAt: "desc" },
  });
  return NextResponse.json({ letters });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const form = await req.formData();
  const title = String(form.get("title") || "").trim();
  if (!title) return NextResponse.json({ error: "A title is required." }, { status: 400 });
  const personIds = String(form.get("personIds") || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const file = form.get("file");
  const replyToId = String(form.get("replyToId") || "").trim() || null;
  if (replyToId) {
    const parent = await prisma.document.findFirst({
      where: { id: replyToId, familyId: ctx.family.id, deletedAt: null },
    });
    if (!parent) return NextResponse.json({ error: "The letter this replies to was not found." }, { status: 404 });
  }
  const saved = await saveFamilyDocument({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    title,
    kind: parseDocKind(String(form.get("kind") || "letter"), DocKind.letter),
    transcript: String(form.get("transcript") || ""),
    writtenAt: String(form.get("writtenAt") || ""),
    personIds,
    file: file instanceof File ? file : null,
    replyToId,
    translation: String(form.get("translation") || "") || null,
    needsReview: String(form.get("needsReview") || "") === "true" ? true : undefined,
  });
  return NextResponse.json(saved);
}
