import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { isLivingAdult } from "@/lib/privacy";
import { consentHeading, grantedConsentIds, livingAdultsNeedingConsent } from "@/lib/consent";

const schema = z.object({
  personId: z.string(),
  granted: z.union([z.boolean(), z.string()]).optional(),
  notes: z.string().max(400).optional(),
});

function asGranted(value?: boolean | string) {
  if (value === false || value === "false" || value === "0") return false;
  return true;
}

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const [people, consents] = await Promise.all([
    prisma.person.findMany({
      where: { familyId: ctx.family.id, deletedAt: null },
      select: { id: true, displayName: true, birthDate: true, deathDate: true },
    }),
    prisma.shareConsent.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const missing = livingAdultsNeedingConsent(people, consents);
  return NextResponse.json({
    consents,
    missing,
    heading: consentHeading(missing.length),
    grantedIds: grantedConsentIds(consents),
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose who is giving consent." }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  if (!isLivingAdult(person)) {
    return NextResponse.json({ error: "Consent is for a living adult." }, { status: 400 });
  }
  const granted = asGranted(body.data.granted);
  const consent = await prisma.shareConsent.upsert({
    where: { familyId_personId: { familyId: ctx.family.id, personId: person.id } },
    create: {
      familyId: ctx.family.id,
      personId: person.id,
      granted,
      grantedOn: granted ? new Date() : null,
      notes: body.data.notes?.trim() || null,
    },
    update: {
      granted,
      grantedOn: granted ? new Date() : null,
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: granted ? "granted" : "withdrew",
    entityType: "share-consent",
    entityId: consent.id,
    title: person.displayName,
  });
  return NextResponse.json({ consent });
}
