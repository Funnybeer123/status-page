import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { exportFamilyArchive } from "@/lib/archiveExport";

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const format = new URL(req.url).searchParams.get("format") || "json";
  const archive = await exportFamilyArchive(ctx.family.id, format === "bundle");
  if (!archive) return NextResponse.json({ error: "Family not found." }, { status: 404 });
  if (format === "gedcom") {
    return new NextResponse(archive.gedcom, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${ctx.family.slug}.ged"`,
      },
    });
  }
  return NextResponse.json(archive);
}
