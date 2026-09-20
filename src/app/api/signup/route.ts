import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(80),
  invite: z.string().optional(),
  familyName: z.string().max(80).optional(),
});

export async function POST(req: Request) {
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Name, email, and a password of 6+ characters are required." }, { status: 400 });
  }
  const email = body.data.email.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }
  const user = await prisma.user.create({
    data: {
      name: body.data.name,
      email,
      passwordHash: await bcrypt.hash(body.data.password, 10),
    },
  });

  if (body.data.invite) {
    const invite = await prisma.invite.findUnique({ where: { token: body.data.invite } });
    if (invite && invite.expiresAt > new Date()) {
      await prisma.membership.upsert({
        where: { userId_familyId: { userId: user.id, familyId: invite.familyId } },
        update: { role: invite.role },
        create: { userId: user.id, familyId: invite.familyId, role: invite.role },
      });
    }
  } else if (body.data.familyName?.trim()) {
    const slug = slugify(body.data.familyName);
    await prisma.family.create({
      data: {
        name: body.data.familyName.trim(),
        slug,
        memberships: { create: { userId: user.id, role: "owner" } },
      },
    });
  }

  return NextResponse.json({ ok: true });
}

function slugify(name: string) {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "family";
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}
