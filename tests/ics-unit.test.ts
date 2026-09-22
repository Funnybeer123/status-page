import assert from "node:assert/strict";
import { test } from "node:test";
import { buildFamilyCalendar } from "../src/lib/ics";

test("ICS includes a yearly birthday", () => {
  const text = buildFamilyCalendar({
    familyName: "Whitaker next",
    reminders: [
      {
        id: "birth-helen",
        kind: "birthday",
        title: "Birthday · Helen Park",
        personId: "helen",
        personName: "Helen Park",
        originalOn: "1954-09-22",
        nextOn: "2026-09-22",
        monthDay: "22 September",
        daysUntil: 0,
        hideYear: false,
      },
    ],
  });
  assert.match(text, /BEGIN:VCALENDAR/);
  assert.match(text, /DTSTART;VALUE=DATE:20260922/);
  assert.match(text, /RRULE:FREQ=YEARLY/);
  assert.match(text, /Helen Park/);
});
