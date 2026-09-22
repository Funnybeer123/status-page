import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { mergePlaces } from "@/lib/merge";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  keepId: z.string(),
  dropId: z.string(),
});

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose the place to keep and the duplicate to fold in." }, { status: 400 });
  try {
    const place = await mergePlaces({
      familyId: ctx.family.id,
      keepId: body.data.keepId,
      dropId: body.data.dropId,
    });
    await recordActivity({
      familyId: ctx.family.id,
      actorId: ctx.session.user.id,
      verb: "merged",
      entityType: "place",
      entityId: place.id,
      title: `Merged a duplicate into ${place.name}`,
    });
    return NextResponse.json({ place });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not merge those places." }, { status: 400 });
  }
}
