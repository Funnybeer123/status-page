import assert from "node:assert/strict";
import { test } from "node:test";
import { lookupCoordinates, mapBounds, projectPoint } from "../src/lib/geocode";

test("known Iowa towns have coordinates", () => {
  const cedar = lookupCoordinates({ name: "Cedar Falls", locality: "Cedar Falls", region: "Iowa" });
  assert.ok(cedar);
  assert.ok(cedar.latitude > 42 && cedar.longitude < -92);
});

test("Market Street rooms keep street coordinates even in Cedar Falls", () => {
  const point = lookupCoordinates({ name: "Market Street rooms", locality: "Cedar Falls", region: "Iowa" });
  assert.deepEqual(point, { latitude: 42.529, longitude: -92.446 });
});

test("projectPoint keeps a northern farm above Cedar Falls", () => {
  const cedar = { latitude: 42.5278, longitude: -92.4453 };
  const farm = { latitude: 42.54, longitude: -92.452 };
  const bounds = mapBounds([cedar, farm]);
  assert.ok(bounds);
  const a = projectPoint(cedar, bounds, 800, 360);
  const b = projectPoint(farm, bounds, 800, 360);
  assert.ok(b.y < a.y);
});

test("Market Street and Cedar Falls stay far enough apart to read", () => {
  const cedar = { latitude: 42.5278, longitude: -92.4453 };
  const market = { latitude: 42.529, longitude: -92.446 };
  const bounds = mapBounds([cedar, market]);
  assert.ok(bounds);
  const a = projectPoint(cedar, bounds, 800, 360);
  const b = projectPoint(market, bounds, 800, 360);
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 20);
});
