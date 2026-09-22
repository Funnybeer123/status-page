import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { webcalHeading, webcalHref } from "@/lib/webcal";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const origin = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "";
  return NextResponse.json({
    token: ctx.family.calendarToken,
    href: ctx.family.calendarToken ? webcalHref(ctx.family.calendarToken, origin) : null,
    heading: webcalHeading(ctx.family.name),
  });
}

export async function POST() {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const token = randomBytes(24).toString("hex");
  const family = await prisma.family.update({
    where: { id: ctx.family.id },
    data: { calendarToken: token },
  });
  const origin = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "";
  return NextResponse.json({
    token: family.calendarToken,
    href: webcalHref(token, origin),
    heading: webcalHeading(family.name),
  });
}
