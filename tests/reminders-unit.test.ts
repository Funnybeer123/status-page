import assert from "node:assert/strict";
import { test } from "node:test";
import { Role } from "@prisma/client";
import { buildReminders, nextOccurrence, remindersThisWeek } from "../src/lib/reminders";

test("nextOccurrence rolls into next year after the date has passed", () => {
  const from = new Date("2026-09-20T12:00:00Z");
  const next = nextOccurrence(new Date("1952-09-25T00:00:00Z"), from);
  assert.equal(next.toISOString().slice(0, 10), "2026-09-25");
  const after = nextOccurrence(new Date("1952-09-08T00:00:00Z"), from);
  assert.equal(after.toISOString().slice(0, 10), "2027-09-08");
});

test("viewers keep living birthdays without a year", () => {
  const from = new Date("2026-09-20T00:00:00Z");
  const reminders = buildReminders(
    [
      {
        id: "n",
        kind: "birthday",
        title: "Nora Park's birthday",
        personId: "nora",
        personName: "Nora Park",
        deathDate: null,
        happenedOn: new Date("1983-09-22T00:00:00Z"),
      },
    ],
    Role.viewer,
    from,
  );
  assert.equal(reminders[0].hideYear, true);
  assert.equal(reminders[0].daysUntil, 2);
  assert.equal(remindersThisWeek(reminders).length, 1);
});
