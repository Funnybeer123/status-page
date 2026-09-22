import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileLifeStory } from "@/lib/book";
import { hideEventFromViewer, shouldHideLivingFacts } from "@/lib/privacy";
import { buildPdf, pdfFilename } from "@/lib/pdf";

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const personId = new URL(req.url).searchParams.get("personId") || undefined;
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, ...(personId ? { id: personId } : {}) },
    include: {
      names: true,
      residences: { include: { place: true } },
      events: { include: { place: true } },
      documents: { include: { document: true } },
      storiesTold: true,
      storyLinks: { include: { story: true } },
    },
    orderBy: { displayName: "asc" },
  });
  const visible = people.filter((person) => !shouldHideLivingFacts(ctx.role, person) || personId);
  const chapters = visible.map((person) =>
    compileLifeStory({
      person,
      names: person.names,
      residences: shouldHideLivingFacts(ctx.role, person) ? [] : person.residences,
      events: person.events.filter((event) => !hideEventFromViewer(ctx.role, { ...event, person })),
      letters: person.documents
        .filter((item) => item.document.kind === "letter" || item.document.kind === "note")
        .map((item) => item.document),
      stories: [...person.storiesTold, ...person.storyLinks.map((link) => link.story)],
    }),
  );
  const pdf = buildPdf(chapters, `${ctx.family.name} family book`);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${pdfFilename(ctx.family.name)}"`,
    },
  });
}
