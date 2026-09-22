import { NextResponse } from "next/server";
import { NameKind } from "@prisma/client";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { nicknameUseLine, unusedNicknamesHeading } from "@/lib/nicknameDictionary";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const names = await prisma.personName.findMany({
    where: { familyId: ctx.family.id, kind: NameKind.nickname, OR: [{ notes: null }, { notes: "" }] },
    include: { person: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({
    heading: unusedNicknamesHeading(names.length),
    nicknames: names.map((row) => ({
      ...row,
      line: nicknameUseLine(row.name, row.person.displayName, row.notes),
    })),
  });
}
