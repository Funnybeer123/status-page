import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { defaultFamilyRules, familyRulesHeading, rulesDenied } from "@/lib/familyRules";

const schema = z.object({
  rulesText: z.string().max(8000),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const text = ctx.family.rulesText?.trim() || defaultFamilyRules();
  return NextResponse.json({
    heading: familyRulesHeading(Boolean(ctx.family.rulesText?.trim())),
    rulesText: text,
    custom: Boolean(ctx.family.rulesText?.trim()),
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.owner);
  if ("error" in ctx) return ctx.error;
  if (ctx.role !== Role.owner) return NextResponse.json({ error: rulesDenied() }, { status: 403 });
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Write how this family keeps its archive." }, { status: 400 });
  const family = await prisma.family.update({
    where: { id: ctx.family.id },
    data: { rulesText: body.data.rulesText.trim() || null },
  });
  return NextResponse.json({
    heading: familyRulesHeading(Boolean(family.rulesText)),
    rulesText: family.rulesText || defaultFamilyRules(),
  });
}
