import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { exportGedcom, parseGedcom } from "@/lib/gedcom";
import { branchGedcomFilename } from "@/lib/webcal";
import { syncVitalEvents, recordMarriageEvent } from "@/lib/events";
import { recordActivity } from "@/lib/activity";

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const branchId = new URL(req.url).searchParams.get("branchId") || undefined;
  const [people, relationships, branch] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
    branchId
      ? prisma.familyBranch.findFirst({
          where: { id: branchId, familyId: ctx.family.id },
          include: { members: true },
        })
      : Promise.resolve(null),
  ]);
  if (branchId && !branch) return NextResponse.json({ error: "Branch not found." }, { status: 404 });
  const allowed = branch ? new Set(branch.members.map((member) => member.personId)) : null;
  const scopedPeople = allowed ? people.filter((person) => allowed.has(person.id)) : people;
  const scopedRels = allowed
    ? relationships.filter((rel) => allowed.has(rel.fromPersonId) && allowed.has(rel.toPersonId))
    : relationships;
  const text = exportGedcom({
    familyName: branch ? branch.name : ctx.family.name,
    people: scopedPeople,
    relationships: scopedRels,
  });
  const filename = branch ? branchGedcomFilename(branch.name) : `${ctx.family.slug}.ged`;
  return new NextResponse(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const contentType = req.headers.get("content-type") || "";
  let text = "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    const pasted = String(form.get("text") || "");
    if (file instanceof File && file.size) text = await file.text();
    else text = pasted;
  } else {
    const body = await req.json().catch(() => null);
    text = String(body?.text || "");
  }
  const parsed = parseGedcom(text);
  if (!parsed.people.length) {
    return NextResponse.json({ error: "That file did not contain any people." }, { status: 400 });
  }

  const idByXref = new Map<string, string>();
  for (const person of parsed.people) {
    const created = await prisma.person.create({
      data: {
        familyId: ctx.family.id,
        displayName: person.displayName,
        givenName: person.givenName || null,
        familyName: person.familyName || null,
        birthDate: person.birthDate ? new Date(person.birthDate) : null,
        deathDate: person.deathDate ? new Date(person.deathDate) : null,
        notes: person.notes,
        sex: person.sex,
        gedcomXref: person.xref,
      },
    });
    idByXref.set(person.xref, created.id);
    await syncVitalEvents({
      familyId: ctx.family.id,
      personId: created.id,
      displayName: created.displayName,
      birthDate: created.birthDate,
      deathDate: created.deathDate,
    });
  }

  for (const fam of parsed.families) {
    const husb = fam.husband ? idByXref.get(fam.husband) : null;
    const wife = fam.wife ? idByXref.get(fam.wife) : null;
    if (husb && wife) {
      await prisma.relationship.create({
        data: {
          familyId: ctx.family.id,
          fromPersonId: husb,
          toPersonId: wife,
          type: "partner",
          startedAt: fam.marriedOn ? new Date(fam.marriedOn) : null,
        },
      });
      const from = parsed.people.find((person) => person.xref === fam.husband);
      const to = parsed.people.find((person) => person.xref === fam.wife);
      await recordMarriageEvent({
        familyId: ctx.family.id,
        fromPersonId: husb,
        toPersonId: wife,
        startedAt: fam.marriedOn ? new Date(fam.marriedOn) : null,
        fromName: from?.displayName || "Someone",
        toName: to?.displayName || "someone",
      });
    }
    for (const childXref of fam.children) {
      const childId = idByXref.get(childXref);
      if (!childId) continue;
      for (const parentId of [husb, wife].filter(Boolean) as string[]) {
        await prisma.relationship.create({
          data: {
            familyId: ctx.family.id,
            fromPersonId: parentId,
            toPersonId: childId,
            type: "parent",
          },
        });
      }
    }
  }

  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "imported",
    entityType: "family",
    title: `Imported ${parsed.people.length} people from GEDCOM`,
    summary: `${parsed.families.length} families.`,
  });

  return NextResponse.json({
    imported: { people: parsed.people.length, families: parsed.families.length },
    ids: Object.fromEntries(idByXref),
  });
}
