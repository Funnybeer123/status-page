import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { auth } from "@/auth";
import { hasAtLeast } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export const FAMILY_COOKIE = "fl_family";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session;
}

export async function getMemberships(userId: string) {
  return prisma.membership.findMany({
    where: { userId },
    include: { family: true },
    orderBy: { family: { name: "asc" } },
  });
}

export async function getFamilyContext(minRole: Role = Role.viewer) {
  const session = await requireUser();
  const jar = await cookies();
  const cookieId = jar.get(FAMILY_COOKIE)?.value;
  const memberships = await getMemberships(session.user.id);

  const membership =
    memberships.find((item) => item.familyId === cookieId) ?? memberships[0] ?? null;

  if (!membership) {
    return { session, membership: null, family: null, role: null, memberships };
  }
  if (!hasAtLeast(membership.role, minRole)) {
    redirect("/families");
  }
  return {
    session,
    membership,
    family: membership.family,
    role: membership.role,
    memberships,
  };
}

export async function requireFamily(minRole: Role = Role.viewer) {
  const ctx = await getFamilyContext(minRole);
  if (!ctx.family || !ctx.membership || !ctx.role) redirect("/families");
  return {
    session: ctx.session,
    membership: ctx.membership,
    family: ctx.family,
    role: ctx.role,
    memberships: ctx.memberships,
  };
}

export async function apiFamily(minRole: Role = Role.viewer) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  }
  const jar = await cookies();
  const cookieId = jar.get(FAMILY_COOKIE)?.value;
  const memberships = await getMemberships(session.user.id);
  const membership =
    memberships.find((item) => item.familyId === cookieId) ?? memberships[0] ?? null;
  if (!membership) {
    return { error: NextResponse.json({ error: "Create or join a family first." }, { status: 400 }) };
  }
  if (!hasAtLeast(membership.role, minRole)) {
    return { error: NextResponse.json({ error: "You do not have permission for that." }, { status: 403 }) };
  }
  return {
    session,
    membership,
    family: membership.family,
    role: membership.role,
    memberships,
  };
}
