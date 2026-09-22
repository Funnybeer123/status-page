import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { chainsHeading, currentHolder, currentHolderLine, holdLine, provenanceHeading, sortHolds } from "@/lib/provenance";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const heirlooms = await prisma.heirloom.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true, holds: { include: { person: true } } },
    orderBy: { title: "asc" },
  });
  const chains = heirlooms
    .map((item) => {
      const holds = sortHolds(item.holds);
      const holder = currentHolder(holds);
      return {
        id: item.id,
        title: item.title,
        heading: provenanceHeading(item.title, holds.length),
        holder: currentHolderLine(item.title, holder?.person.displayName ?? item.person?.displayName),
        holds,
        lines: holds.map((hold) =>
          holdLine(hold.person.displayName, formatDate(hold.heldFrom, ""), formatDate(hold.heldUntil, "") || null),
        ),
      };
    })
    .filter((item) => item.holds.length);
  return NextResponse.json({
    chains,
    heading: chainsHeading(chains.length),
  });
}
