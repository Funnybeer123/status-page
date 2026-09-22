import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { mediaRoot } from "@/lib/media";
import { hideMinorDetails, shouldHideLivingFacts } from "@/lib/privacy";
import { compilePersonFacts, packetLetterName, packetPhotoName, packetSlug } from "@/lib/personPacket";
import { buildZip } from "@/lib/zip";

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
    return NextResponse.json({ error: "A living child’s packet is not shared with viewers." }, { status: 403 });
  }
  const hideLiving = shouldHideLivingFacts(ctx.role, person);
  const letters = person.documents
    .map((item) => item.document)
    .filter((document) => document && !document.deletedAt && document.kind !== "story");
  const photos = person.tags
    .map((tag) => tag.asset)
    .filter((asset) => asset && !asset.deletedAt && asset.kind === "photo");
  const facts = hideLiving
    ? []
    : person.citations.map((citation) => ({ claim: citation.claim, quality: citation.quality }));
  const files: { name: string; data: Buffer }[] = [
    {
      name: "facts.txt",
      data: Buffer.from(
        compilePersonFacts({
          person,
          letters,
          photos: photos.map((photo) => ({ title: photo.title, filename: photo.storagePath })),
          facts,
          hideLiving,
        }),
        "utf8",
      ),
    },
  ];
  letters.forEach((letter, index) => {
    files.push({
      name: packetLetterName(letter.title, index),
      data: Buffer.from(`${letter.title}\n\n${letter.transcript}\n`, "utf8"),
    });
  });
  for (const [index, photo] of photos.entries()) {
    try {
      const bytes = await readFile(join(mediaRoot(), photo.storagePath));
      files.push({
        name: packetPhotoName(photo.title, photo.storagePath, index),
        data: bytes,
      });
    } catch {
      files.push({
        name: packetPhotoName(photo.title, photo.storagePath, index) + ".missing.txt",
        data: Buffer.from("Photograph file was not on this machine.\n", "utf8"),
      });
    }
  }
  const zip = buildZip(files);
  const filename = `${packetSlug(person.displayName)}-packet.zip`;
  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
