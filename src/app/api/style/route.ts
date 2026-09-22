import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import {
  dateStyleLabel,
  formatStyledDate,
  formatStyledName,
  nameStyleLabel,
  resolveDateStyle,
  resolveNameStyle,
  styleExampleLine,
  styleSheetHeading,
} from "@/lib/styleSheet";

const schema = z.object({
  nameStyle: z.enum(["given-family", "family-given", "display"]).optional().nullable(),
  dateStyle: z.enum(["day-month-year", "month-day-year", "year-only"]).optional().nullable(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const nameStyle = resolveNameStyle(ctx.family.nameStyle);
  const dateStyle = resolveDateStyle(ctx.family.dateStyle);
  const sample = { displayName: "Eleanor Hart", givenName: "Eleanor", familyName: "Hart" };
  return NextResponse.json({
    nameStyle,
    dateStyle,
    heading: styleSheetHeading(),
    nameLabel: nameStyleLabel(nameStyle),
    dateLabel: dateStyleLabel(dateStyle),
    example: styleExampleLine(formatStyledName(sample, nameStyle), formatStyledDate("1948-06-14", dateStyle)),
  });
}

export async function PATCH(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose how names and dates should be written." }, { status: 400 });
  const family = await prisma.family.update({
    where: { id: ctx.family.id },
    data: {
      nameStyle: body.data.nameStyle === undefined ? ctx.family.nameStyle : body.data.nameStyle,
      dateStyle: body.data.dateStyle === undefined ? ctx.family.dateStyle : body.data.dateStyle,
    },
  });
  return NextResponse.json({
    family,
    heading: styleSheetHeading(),
    nameLabel: nameStyleLabel(family.nameStyle),
    dateLabel: dateStyleLabel(family.dateStyle),
  });
}
