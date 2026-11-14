import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { layoutWarnings, normalize, validateStructure } from "../src/lib/validate.js";

const defaultPlan = normalize(JSON.parse(readFileSync(new URL("../src/config/default-plan.json", import.meta.url))));

test("default plan is valid and has no layout warnings", () => {
  assert.deepEqual(validateStructure(defaultPlan), []);
  assert.deepEqual(layoutWarnings(defaultPlan), []);
});

test("normalize fills in defaults", () => {
  const plan = normalize({ rooms: [] });
  assert.equal(plan.wall, 10);
  assert.deepEqual(plan.doors, []);
  assert.deepEqual(plan.windows, []);
});

test("structure errors are reported", () => {
  assert.equal(validateStructure(normalize({})).length, 1);
  const bad = normalize({
    rooms: [{ id: "a", name: "A", x: 0, y: 0, w: 100, h: 100 }],
    doors: [{ room: "zzz", wall: "Q", offset: 0, width: 80, swing: "sideways" }],
  });
  const errors = validateStructure(bad);
  assert.ok(errors.some((e) => e.includes("unknown room")));
  assert.ok(errors.some((e) => e.includes("N, E, S or W")));
  assert.ok(errors.some((e) => e.includes("swing")));
});

test("overlapping rooms and over-long openings warn", () => {
  const plan = normalize({
    rooms: [
      { id: "a", name: "A", x: 0, y: 0, w: 100, h: 100 },
      { id: "b", name: "B", x: 50, y: 50, w: 100, h: 100 },
    ],
    windows: [{ room: "a", wall: "N", offset: 50, width: 80 }],
  });
  const warnings = layoutWarnings(plan);
  assert.equal(warnings.length, 2);
});
