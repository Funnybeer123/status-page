import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileTeachers, teacherLine, teachersHeading } from "@/lib/schoolteacher";

const schema = z.object({
  classId: z.string(),
  personId: z.string(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const classes = await prisma.schoolClass.findMany({
    where: { familyId: ctx.family.id, teacherId: { not: null } },
    include: { teacher: true },
  });
  const rows = compileTeachers(
    classes
      .filter((row) => row.teacher)
      .map((row) => ({
        id: row.id,
        teacher: row.teacher!.displayName,
        school: row.school,
        year: row.year,
      })),
  );
  return NextResponse.json({ teachers: rows, heading: teachersHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Who taught that year?" }, { status: 400 });
  const [row, person] = await Promise.all([
    prisma.schoolClass.findFirst({ where: { id: body.data.classId, familyId: ctx.family.id } }),
    prisma.person.findFirst({ where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null } }),
  ]);
  if (!row || !person) return NextResponse.json({ error: "Class or person not found." }, { status: 404 });
  const updated = await prisma.schoolClass.update({
    where: { id: row.id },
    data: { teacherId: person.id },
    include: { teacher: true },
  });
  return NextResponse.json({
    class: updated,
    line: teacherLine(updated.teacher?.displayName, updated.school, updated.year),
  });
}
