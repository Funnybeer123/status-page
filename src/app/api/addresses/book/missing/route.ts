import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileAddressBook, missingAddressHeading } from "@/lib/addressBook";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const [people, addresses, phones] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null } }),
    prisma.familyAddress.findMany({ where: { familyId: ctx.family.id } }),
    prisma.familyPhoneContact.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const missing = compileAddressBook(people, addresses, phones, ctx.role).filter((row) => !row.line);
  return NextResponse.json({ heading: missingAddressHeading(missing.length), people: missing });
}
