import { randomBytes } from "node:crypto";
import { extname } from "node:path";
import { NextResponse } from "next/server";
import { AssetKind, Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { saveUpload } from "@/lib/media";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(4000).optional(),
  personId: z.string().optional(),
});

const patchSchema = z.object({
  id: z.string(),
  done: z.boolean(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const tasks = await prisma.researchTask.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true, asset: true },
    orderBy: [{ doneAt: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ tasks });
}

async function readCreate(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    return {
      title: String(form.get("title") || ""),
      body: String(form.get("body") || "") || undefined,
      personId: String(form.get("personId") || "") || undefined,
      file: file instanceof File && file.size ? file : null,
    };
  }
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return null;
  return { ...parsed.data, file: null as File | null };
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const input = await readCreate(req);
  if (!input?.title.trim()) return NextResponse.json({ error: "A research task needs a title." }, { status: 400 });
  let assetId: string | null = null;
  if (input.file) {
    const bytes = Buffer.from(await input.file.arrayBuffer());
    const ext = extname(input.file.name) || ".bin";
    const filename = `${Date.now()}-${randomBytes(4).toString("hex")}${ext}`;
    const storagePath = await saveUpload(ctx.family.id, filename, bytes);
    const asset = await prisma.asset.create({
      data: {
        familyId: ctx.family.id,
        kind: input.file.type.startsWith("audio/") ? AssetKind.audio : AssetKind.photo,
        title: input.file.name,
        mimeType: input.file.type || "application/octet-stream",
        storagePath,
        uploadedById: ctx.session.user.id,
      },
    });
    assetId = asset.id;
  }
  const task = await prisma.researchTask.create({
    data: {
      familyId: ctx.family.id,
      title: input.title.trim(),
      body: input.body?.trim() || null,
      personId: input.personId || null,
      createdById: ctx.session.user.id,
      assetId,
    },
    include: { person: true, asset: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "task",
    entityId: task.id,
    title: task.title,
    summary: task.person?.displayName || "research",
  });
  return NextResponse.json({ task });
}

export async function PATCH(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = patchSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Mark which task is done." }, { status: 400 });
  const existing = await prisma.researchTask.findFirst({
    where: { id: body.data.id, familyId: ctx.family.id },
  });
  if (!existing) return NextResponse.json({ error: "Task not found." }, { status: 404 });
  const task = await prisma.researchTask.update({
    where: { id: existing.id },
    data: { doneAt: body.data.done ? new Date() : null },
    include: { person: true, asset: true },
  });
  return NextResponse.json({ task });
}
