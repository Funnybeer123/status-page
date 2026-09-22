import assert from "node:assert/strict";
import { test } from "node:test";
import { Role } from "@prisma/client";
import { collectOnThisDay, sameMonthDay } from "../src/lib/onThisDay";

test("sameMonthDay matches across years", () => {
  assert.equal(sameMonthDay("1944-09-22", new Date("2026-09-22T12:00:00Z")), true);
  assert.equal(sameMonthDay("1944-09-21", new Date("2026-09-22T12:00:00Z")), false);
});

test("collectOnThisDay keeps a birth, a letter, and a military fact", () => {
  const items = collectOnThisDay(
    {
      people: [{ id: "sam", displayName: "Samuel Hart", birthDate: "1926-09-08", deathDate: "2018-01-19" }],
      events: [
        {
          id: "mil",
          kind: "military",
          title: "Samuel reported for the county draft board",
          summary: null,
          happenedOn: "1944-09-22",
          personId: "sam",
        },
      ],
      documents: [{ id: "let", title: "Aunt June", kind: "letter", writtenAt: "1952-09-22" }],
      assets: [{ id: "scan", title: "Aunt June", kind: "letter", capturedAt: "1952-09-22" }],
      stories: [],
      role: Role.owner,
    },
    new Date("2026-09-22T00:00:00Z"),
  );
  assert.ok(items.some((item) => /draft board/.test(item.title)));
  assert.equal(items.filter((item) => /Aunt June/.test(item.title)).length, 1);
});

test("letter scans do not appear twice on this day", () => {
  const items = collectOnThisDay(
    {
      people: [],
      events: [],
      documents: [{ id: "let", title: "Aunt June", kind: "letter", writtenAt: "1952-09-22" }],
      assets: [{ id: "scan", title: "Aunt June", kind: "letter", capturedAt: "1952-09-22" }],
      stories: [],
      role: Role.owner,
    },
    new Date("2026-09-22T00:00:00Z"),
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].kind, "letter");
});
