import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { MeetingForm } from "@/app/box/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { formatDate } from "@/lib/dates";
import { attendeesLine, meetingHeading, meetingLine, meetingNotesLine } from "@/lib/meetings";
import { canWrite } from "@/lib/roles";

export default async function MeetingsPage() {
  const ctx = await requireFamily();
  const [meetings, people] = await Promise.all([
    prisma.familyMeeting.findMany({
      where: { familyId: ctx.family.id },
      include: { attendees: { include: { person: true } }, createdBy: { select: { name: true } } },
      orderBy: [{ happenedOn: "desc" }, { createdAt: "desc" }],
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive }, orderBy: { displayName: "asc" } }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="meetings-heading">
        {meetingHeading(meetings.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">Notes from a family meeting — who was there, and what was decided.</p>
      {canWrite(ctx.role) ? (
        <MeetingForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="meetings-list">
        {meetings.map((meeting) => (
          <li key={meeting.id} className="paper-card p-5">
            <p className="font-display text-2xl">{meetingLine(meeting.title, formatDate(meeting.happenedOn, ""))}</p>
            <p className="mt-2 text-bark" data-testid="meeting-notes">
              {meetingNotesLine(meeting.notes)}
            </p>
            <p className="mt-2 font-sans text-sm text-gold">
              {attendeesLine(meeting.attendees.map((row) => row.person.displayName))}
              {meeting.createdBy?.name ? ` · written by ${meeting.createdBy.name}` : ""}
            </p>
            <p className="mt-2 font-sans text-sm">
              {meeting.attendees.map((row, index) => (
                <span key={row.personId}>
                  {index ? " · " : ""}
                  <Link href={`/people/${row.person.id}`} className="text-seal">
                    {row.person.displayName}
                  </Link>
                </span>
              ))}
            </p>
          </li>
        ))}
        {!meetings.length ? <li className="text-bark">No family meeting notes yet.</li> : null}
      </ul>
    </AppShell>
  );
}
