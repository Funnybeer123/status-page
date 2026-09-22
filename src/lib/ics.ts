import type { Reminder } from "@/lib/reminders";

function fold(line: string) {
  return line.replace(/[,;\\]/g, (char) => `\\${char}`).replace(/\n/g, "\\n");
}

function ymd(value: string) {
  return value.replace(/-/g, "");
}

export function buildFamilyCalendar(input: { familyName: string; reminders: Reminder[] }) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Family Lineage//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${fold(input.familyName)} family dates`,
  ];
  for (const item of input.reminders) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${item.id}@family-lineage`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(item.nextOn)}`,
      "RRULE:FREQ=YEARLY",
      `SUMMARY:${fold(item.title)}`,
      `DESCRIPTION:${fold(`${item.personName} · ${item.monthDay}`)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
