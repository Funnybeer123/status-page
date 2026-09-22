import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { mergePeople } from "@/lib/merge";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  keepId: z.string(),
  dropId: z.string(),
});

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose the person to keep and the duplicate to fold in." }, { status: 400 });
  try {
    const person = await mergePeople({
      familyId: ctx.family.id,
      keepId: body.data.keepId,
      dropId: body.data.dropId,
    });
    await recordActivity({
      familyId: ctx.family.id,
      actorId: ctx.session.user.id,
      verb: "merged",
      entityType: "person",
      entityId: person.id,
      title: `Merged a duplicate into ${person.displayName}`,
      summary: "One record now holds both lives.",
    });
    return NextResponse.json({ person });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not merge those people." }, { status: 400 });
  }
}
