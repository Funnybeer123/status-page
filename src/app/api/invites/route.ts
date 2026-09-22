import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { Role } from "@prisma/client";
import { apiFamily } from "@/lib/family";
import { canInvite } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import {
  parseExpiresOn,
  researcherInviteHeading,
  researcherInviteLine,
  researcherRole,
} from "@/lib/researcherInvite";

const schema = z.object({
  email: z.string().email().optional().or(z.literal("")),
  role: z.nativeEnum(Role).default(Role.contributor),
  purpose: z.enum(["member", "researcher"]).optional(),
  expiresOn: z.string().optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const invites = await prisma.invite.findMany({
    where: { familyId: ctx.family.id },
    orderBy: { createdAt: "desc" },
  });
  const researchers = invites.filter((invite) => invite.purpose === "researcher");
  return NextResponse.json({
    invites,
    researchers,
    heading: researcherInviteHeading(researchers.length),
    lines: researchers.map((invite) => researcherInviteLine(invite.email, invite.expiresAt)),
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  if (!canInvite(ctx.role)) {
    return NextResponse.json({ error: "Only an owner can invite." }, { status: 403 });
  }
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid invite." }, { status: 400 });
  const purpose = body.data.purpose || "member";
  const invite = await prisma.invite.create({
    data: {
      familyId: ctx.family.id,
      email: body.data.email || null,
      role: researcherRole(purpose, body.data.role),
      purpose,
      token: randomBytes(18).toString("hex"),
      expiresAt: parseExpiresOn(body.data.expiresOn),
    },
  });
  return NextResponse.json({
    token: invite.token,
    path: `/signup?invite=${invite.token}`,
    role: invite.role,
    purpose: invite.purpose,
    expiresAt: invite.expiresAt,
  });
}
