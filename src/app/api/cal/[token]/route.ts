import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { loadFamilyReminders } from "@/lib/familyDates";
import { buildFamilyCalendar } from "@/lib/ics";
import { webcalHeading } from "@/lib/webcal";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "Calendar not found." }, { status: 404 });
  const family = await prisma.family.findFirst({ where: { calendarToken: token } });
  if (!family) return NextResponse.json({ error: "Calendar not found." }, { status: 404 });
  const { reminders } = await loadFamilyReminders(family.id, Role.viewer);
  const text = buildFamilyCalendar({ familyName: family.name, reminders });
  return new NextResponse(text, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${family.slug}-dates.ics"`,
      "X-WR-CALNAME": webcalHeading(family.name),
    },
  });
}
