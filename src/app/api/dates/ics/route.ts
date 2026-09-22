import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { loadFamilyReminders } from "@/lib/familyDates";
import { buildFamilyCalendar } from "@/lib/ics";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { reminders } = await loadFamilyReminders(ctx.family.id, ctx.role);
  const text = buildFamilyCalendar({ familyName: ctx.family.name, reminders });
  return new NextResponse(text, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${ctx.family.slug}-dates.ics"`,
    },
  });
}
