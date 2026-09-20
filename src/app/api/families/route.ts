import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { Role } from "@prisma/client";
import { auth } from "@/auth";
import { FAMILY_COOKIE, getMemberships } from "@/lib/family";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const memberships = await getMemberships(session.user.id);
  const jar = await cookies();
  const active = jar.get(FAMILY_COOKIE)?.value ?? memberships[0]?.familyId ?? null;
  return NextResponse.json({
    memberships: memberships.map((item) => ({
      role: item.role,
      family: item.family,
    })),
    activeFamilyId: active,
  });
}

const createSchema = z.object({
  name: z.string().min(1).max(80),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = createSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Family name is required." }, { status: 400 });
  const slug = `${body.data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "family"}-${Math.random().toString(36).slice(2, 7)}`;
  const family = await prisma.family.create({
    data: {
      name: body.data.name.trim(),
      slug,
      memberships: { create: { userId: session.user.id, role: Role.owner } },
    },
  });
  const jar = await cookies();
  jar.set(FAMILY_COOKIE, family.id, { path: "/", sameSite: "lax" });
  return NextResponse.json({ family });
}
