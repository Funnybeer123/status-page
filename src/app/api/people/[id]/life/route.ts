import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileLifeStory } from "@/lib/book";
import { hideEventFromViewer, hideMinorDetails, shouldHideLivingFacts } from "@/lib/privacy";
import { buildPdf } from "@/lib/pdf";
import { lifePdfFilename, lifePdfTitle } from "@/lib/lifePdf";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const person = await prisma.person.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
    include: {
      names: true,
      residences: { include: { place: true } },
      events: { include: { place: true } },
      documents: { include: { document: true } },
      storiesTold: true,
      storyLinks: { include: { story: true } },
    },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  if (hideMinorDetails(ctx.role, person)) {
    return NextResponse.json({ error: "A living child’s life is not shared with viewers." }, { status: 403 });
  }
  const hideLiving = shouldHideLivingFacts(ctx.role, person);
  const chapter = compileLifeStory({
    person,
    names: hideLiving ? [] : person.names,
    residences: hideLiving ? [] : person.residences,
    events: person.events.filter((event) => !hideEventFromViewer(ctx.role, { ...event, person })),
    letters: hideLiving
      ? []
      : person.documents
          .filter((item) => item.document.kind === "letter" || item.document.kind === "note")
          .map((item) => item.document),
    stories: [...person.storiesTold, ...person.storyLinks.map((link) => link.story)],
    style: { nameStyle: ctx.family.nameStyle, dateStyle: ctx.family.dateStyle },
  });
  const title = lifePdfTitle(person.displayName);
  const pdf = buildPdf([chapter], title);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${lifePdfFilename(person.displayName)}"`,
    },
  });
}
