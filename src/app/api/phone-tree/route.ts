import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { phoneTreeHeading, phoneTreeLine, sortPhoneTree } from "@/lib/phoneTree";

const schema = z.object({
  personId: z.string(),
  phone: z.string().min(1).max(80),
  callOrder: z.number().int().min(1).max(999).optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const contacts = await prisma.familyPhoneContact.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true },
  });
  const items = sortPhoneTree(
    contacts.map((row) => ({
      id: row.id,
      personId: row.personId,
      personName: row.person.displayName,
      phone: row.phone,
      callOrder: row.callOrder,
      line: phoneTreeLine(row.person.displayName, row.phone, row.callOrder),
      href: `/people/${row.personId}`,
    })),
  );
  return NextResponse.json({ heading: phoneTreeHeading(items.length), items });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A phone tree needs a person and a number." }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const contact = await prisma.familyPhoneContact.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      phone: body.data.phone.trim(),
      callOrder: body.data.callOrder ?? 1,
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  return NextResponse.json({
    contact,
    line: phoneTreeLine(contact.person.displayName, contact.phone, contact.callOrder),
  });
}
