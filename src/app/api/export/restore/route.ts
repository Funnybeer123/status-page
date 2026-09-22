import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { apiFamily } from "@/lib/family";
import { restoreFamilyArchive } from "@/lib/archiveRestore";
import { recordActivity } from "@/lib/activity";

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const contentType = req.headers.get("content-type") || "";
  let archive: Record<string, unknown> = {};
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    const pasted = String(form.get("text") || "");
    const raw = file instanceof File && file.size ? await file.text() : pasted;
    archive = JSON.parse(raw) as Record<string, unknown>;
  } else {
    archive = (await req.json().catch(() => null)) as Record<string, unknown>;
  }
  if (!archive || !Array.isArray(archive.people)) {
    return NextResponse.json({ error: "That file is not a Family Lineage archive." }, { status: 400 });
  }
  const restored = await restoreFamilyArchive({
    familyId: ctx.family.id,
    archive,
    createdById: ctx.session.user.id,
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "restored",
    entityType: "family",
    title: `Restored ${restored.people} people from an archive`,
    summary: `${restored.documents} documents, ${restored.stories} stories.`,
  });
  return NextResponse.json({ restored });
}
