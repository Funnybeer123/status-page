import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { alive } from "@/lib/alive";
import { attendeesLine, meetingHeading, meetingLine } from "@/lib/meetings";
import { formatDate } from "@/lib/dates";

const schema = z.object({
  title: z.string().min(1).max(200),
  notes: z.string().min(1).max(8000),
  happenedOn: z.string().optional().nullable(),
  personIds: z.array(z.string()).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const meetings = await prisma.familyMeeting.findMany({
    where: { familyId: ctx.family.id },
    include: { attendees: { include: { person: true } }, createdBy: { select: { name: true } } },
    orderBy: [{ happenedOn: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({
    meetings,
    heading: meetingHeading(meetings.length),
    lines: meetings.map((meeting) => meetingLine(meeting.title, formatDate(meeting.happenedOn, ""))),
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A meeting needs a title and notes." }, { status: 400 });
  const personIds = [...new Set(body.data.personIds ?? [])];
  const people = personIds.length
    ? await prisma.person.findMany({ where: { id: { in: personIds }, familyId: ctx.family.id, ...alive } })
    : [];
  const meeting = await prisma.familyMeeting.create({
    data: {
      familyId: ctx.family.id,
      title: body.data.title.trim(),
      notes: body.data.notes.trim(),
      happenedOn: body.data.happenedOn ? new Date(body.data.happenedOn) : null,
      createdById: ctx.session.user.id,
      attendees: { create: people.map((person) => ({ personId: person.id })) },
    },
    include: { attendees: { include: { person: true } }, createdBy: { select: { name: true } } },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "recorded",
    entityType: "meeting",
    entityId: meeting.id,
    title: meeting.title,
    summary: attendeesLine(meeting.attendees.map((row) => row.person.displayName)),
  });
  return NextResponse.json({
    meeting,
    heading: meetingLine(meeting.title, formatDate(meeting.happenedOn, "")),
  });
}
