import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { hideMinorDetails } from "@/lib/privacy";
import { missingLettersBookletHeading } from "@/lib/packetBooklet";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, ...alive },
    include: { documents: { include: { document: true } } },
    orderBy: { displayName: "asc" },
  });
  const missing = people
    .filter((person) => !hideMinorDetails(ctx.role, person))
    .filter((person) =>
      !person.documents.some(
        (item) =>
          item.document &&
          !item.document.deletedAt &&
          (item.document.kind === "letter" || item.document.kind === "note"),
      ),
    )
    .map((person) => ({ id: person.id, displayName: person.displayName }));
  return NextResponse.json({ heading: missingLettersBookletHeading(missing.length), people: missing });
}
