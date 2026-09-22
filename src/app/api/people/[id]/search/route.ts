import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideMinorDetails, shouldHideLivingFacts } from "@/lib/privacy";
import { searchPersonItems } from "@/lib/personSearch";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const query = new URL(req.url).searchParams.get("q") || "";
  const person = await prisma.person.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
    include: {
      documents: { include: { document: true } },
      storiesTold: true,
      storyLinks: { include: { story: true } },
      tags: { include: { asset: true } },
      events: true,
      lifeChapters: true,
    },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  if (hideMinorDetails(ctx.role, person) || shouldHideLivingFacts(ctx.role, person)) {
    return NextResponse.json({ hits: [], query });
  }
  const items = [
    ...person.storiesTold.map((story) => ({
      id: story.id,
      kind: "story" as const,
      title: story.title,
      body: story.body,
      href: `/stories/${story.id}`,
    })),
    ...person.storyLinks.map((link) => ({
      id: link.story.id,
      kind: "story" as const,
      title: link.story.title,
      body: link.story.body,
      href: `/stories/${link.story.id}`,
    })),
    ...person.documents
      .filter((item) => !item.document.deletedAt)
      .map((item) => ({
        id: item.document.id,
        kind: "letter" as const,
        title: item.document.title,
        body: item.document.transcript,
        href: `/letters/${item.document.id}`,
      })),
    ...person.tags
      .filter((tag) => !tag.asset.deletedAt)
      .map((tag) => ({
        id: tag.asset.id,
        kind: "photo" as const,
        title: tag.asset.title || "Photograph",
        body: "",
        href: `/archive/${tag.asset.id}`,
      })),
    ...person.events.map((event) => ({
      id: event.id,
      kind: "event" as const,
      title: event.title,
      body: event.summary,
      href: `/people/${person.id}#event-${event.id}`,
    })),
    ...(person.notes
      ? [{ id: `${person.id}-note`, kind: "note" as const, title: "Notes", body: person.notes, href: `/people/${person.id}` }]
      : []),
    ...person.lifeChapters.map((chapter) => ({
      id: chapter.id,
      kind: "chapter" as const,
      title: chapter.title,
      body: chapter.notes,
      href: `/people/${person.id}/chapters`,
    })),
  ];
  return NextResponse.json({ hits: searchPersonItems(items, query), query });
}
