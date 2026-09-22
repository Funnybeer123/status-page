import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideMinorDetails, shouldHideLivingFacts } from "@/lib/privacy";
import { buildPdf } from "@/lib/pdf";
import { bookletFilename, bookletHeading, compilePacketBooklet } from "@/lib/packetBooklet";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const person = await prisma.person.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
    include: {
      documents: { include: { document: true } },
      tags: { include: { asset: true } },
      citations: true,
    },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  if (hideMinorDetails(ctx.role, person)) {
    return NextResponse.json({ error: "A living child’s booklet is not shared with viewers." }, { status: 403 });
  }
  const hideLiving = shouldHideLivingFacts(ctx.role, person);
  const letters = hideLiving
    ? []
    : person.documents
        .map((item) => item.document)
        .filter((document) => document && !document.deletedAt && (document.kind === "letter" || document.kind === "note"));
  const photos = person.tags
    .map((tag) => tag.asset)
    .filter((asset) => asset && !asset.deletedAt && asset.kind === "photo");
  const facts = hideLiving
    ? []
    : person.citations.map((citation) => ({ claim: citation.claim, quality: citation.quality }));
  const chapters = compilePacketBooklet({
    person,
    letters,
    photos: photos.map((photo) => ({ title: photo.title, filename: photo.storagePath })),
    facts,
    hideLiving,
  });
  const title = bookletHeading(person.displayName);
  const pdf = buildPdf(chapters, title);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${bookletFilename(person.displayName)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
