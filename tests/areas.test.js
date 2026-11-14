import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cm2ToM2, groupRooms, totals } from "../src/lib/areas.js";

const defaultPlan = JSON.parse(readFileSync(new URL("../src/config/default-plan.json", import.meta.url)));

test("cm² to m²", () => {
  assert.equal(cm2ToM2(400, 300), 12);
});

test("grouped rooms are added into one entry", () => {
  const plan = {
    rooms: [
      { id: "a", name: "A part", group: "Big room", x: 0, y: 0, w: 100, h: 100 },
      { id: "b", name: "B part", group: "Big room", x: 110, y: 0, w: 100, h: 50 },
      { id: "c", name: "Terrace", x: 0, y: 200, w: 100, h: 100, outdoor: true },
    ],
  };
  const entries = groupRooms(plan);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].name, "Big room");
  assert.equal(entries[0].m2, 1.5);
  assert.equal(entries[0].main.id, "a");
  assert.deepEqual(totals(entries), { indoor: 1.5, outdoor: 1, grand: 2.5 });
});

test("default plan has the dining + living room as one room", () => {
  const entries = groupRooms(defaultPlan);
  const combined = entries.find((e) => e.name === "Dining + living room");
  assert.ok(combined);
  assert.equal(combined.parts.length, 2);
  assert.ok(Math.abs(combined.m2 - (310 * 515 + 222 * 380) / 10000) < 1e-9);
});
