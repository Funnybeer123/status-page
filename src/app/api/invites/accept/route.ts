import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { auth } from "@/auth";
import { FAMILY_COOKIE } from "@/lib/family";
import { prisma } from "@/lib/prisma";

const schema = z.object({ token: z.string().min(4) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invite token is required." }, { status: 400 });
  const invite = await prisma.invite.findUnique({ where: { token: body.data.token } });
  if (!invite || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "That invite is missing or expired." }, { status: 404 });
  }
  await prisma.membership.upsert({
    where: { userId_familyId: { userId: session.user.id, familyId: invite.familyId } },
    update: { role: invite.role },
    create: { userId: session.user.id, familyId: invite.familyId, role: invite.role },
  });
  const jar = await cookies();
  jar.set(FAMILY_COOKIE, invite.familyId, { path: "/", sameSite: "lax" });
  return NextResponse.json({ ok: true, familyId: invite.familyId });
}
