import assert from "node:assert/strict";
import { test } from "node:test";
import { monthGrid, monthTitle } from "../src/lib/calendarMonth";
import { decadeOf, groupByDecade } from "../src/lib/decades";

test("September 2026 calendar includes a 22nd birthday", () => {
  const grid = monthGrid(2026, 9, [
    { id: "helen", title: "Helen Park's birthday", personId: "helen", happenedOn: "2026-09-22" },
  ]);
  assert.equal(grid.length % 7, 0);
  const day = grid.find((cell) => cell.inMonth && cell.day === 22);
  assert.ok(day);
  assert.equal(day!.items[0]?.title, "Helen Park's birthday");
  assert.match(monthTitle(2026, 9), /September 2026/);
});

test("decades group 1948 with the 1940s", () => {
  assert.equal(decadeOf("1948-06-14"), 1940);
  const groups = groupByDecade([
    { title: "Wedding", happenedOn: "1948-06-14" },
    { title: "Letter", writtenAt: "1952-06-20" },
    { title: "Undated note" },
  ]);
  assert.equal(groups[0][0], 1940);
  assert.equal(groups.at(-1)?.[0], "undated");
});
