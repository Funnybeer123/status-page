import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { livingPeople } from "@/lib/moreFamily";
import { isLivingMinor } from "@/lib/privacy";
import { canWrite } from "@/lib/roles";
import { buildAgePyramid } from "@/lib/pyramid";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, ...alive },
  });
  const living = livingPeople(people).filter((person) => canWrite(ctx.role) || !isLivingMinor(person));
  const pyramid = buildAgePyramid(living);
  return NextResponse.json(pyramid);
}
