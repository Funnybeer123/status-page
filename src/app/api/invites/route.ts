import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { Role } from "@prisma/client";
import { apiFamily } from "@/lib/family";
import { canInvite } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  email: z.string().email().optional().or(z.literal("")),
  role: z.nativeEnum(Role).default(Role.contributor),
});

export async function POST(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  if (!canInvite(ctx.role)) {
    return NextResponse.json({ error: "Only an owner can invite." }, { status: 403 });
  }
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid invite." }, { status: 400 });
  const invite = await prisma.invite.create({
    data: {
      familyId: ctx.family.id,
      email: body.data.email || null,
      role: body.data.role,
      token: randomBytes(18).toString("hex"),
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });
  return NextResponse.json({
    token: invite.token,
    path: `/signup?invite=${invite.token}`,
    role: invite.role,
    expiresAt: invite.expiresAt,
  });
}
