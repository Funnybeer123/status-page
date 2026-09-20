import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { auth } from "@/auth";
import { FAMILY_COOKIE } from "@/lib/family";
import { prisma } from "@/lib/prisma";

const schema = z.object({ familyId: z.string().min(1) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Family is required." }, { status: 400 });
  const membership = await prisma.membership.findUnique({
    where: { userId_familyId: { userId: session.user.id, familyId: body.data.familyId } },
  });
  if (!membership) return NextResponse.json({ error: "You do not belong to that family." }, { status: 403 });
  const jar = await cookies();
  jar.set(FAMILY_COOKIE, membership.familyId, { path: "/", sameSite: "lax" });
  return NextResponse.json({ ok: true, familyId: membership.familyId });
}
