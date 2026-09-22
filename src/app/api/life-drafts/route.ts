import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { emptyLifeDraftsHeading, isEmptyDraft, lifeDraftHeading, mergeDraftBody } from "@/lib/lifeDraft";

const schema = z.object({
  personId: z.string(),
  title: z.string().max(200).optional(),
  body: z.string().max(20000).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const drafts = await prisma.lifeDraft.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({
    drafts: drafts.map((draft) => ({
      ...draft,
      heading: lifeDraftHeading(draft.person.displayName),
      empty: isEmptyDraft(draft.body),
    })),
    heading: emptyLifeDraftsHeading(drafts.filter((draft) => isEmptyDraft(draft.body)).length),
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A life draft needs a person." }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const existing = await prisma.lifeDraft.findUnique({
    where: { familyId_personId: { familyId: ctx.family.id, personId: person.id } },
  });
  const title = body.data.title?.trim() || existing?.title || lifeDraftHeading(person.displayName);
  const nextBody = body.data.body != null ? mergeDraftBody(existing?.body || "", body.data.body) : existing?.body || "";
  const draft = await prisma.lifeDraft.upsert({
    where: { familyId_personId: { familyId: ctx.family.id, personId: person.id } },
    create: { familyId: ctx.family.id, personId: person.id, title, body: nextBody },
    update: { title, body: nextBody },
    include: { person: true },
  });
  return NextResponse.json({ draft, heading: lifeDraftHeading(person.displayName) });
}
