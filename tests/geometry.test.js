import test from "node:test";
import assert from "node:assert/strict";
import { doorSwing, openingRect, planBounds, wallBand } from "../src/lib/geometry.js";

const room = { id: "r", name: "R", x: 0, y: 0, w: 300, h: 200 };
const plan = { wall: 10, rooms: [room] };

test("wall bands sit outside the room", () => {
  assert.deepEqual(wallBand(room, "N", 10).y, -10);
  assert.deepEqual(wallBand(room, "S", 10).y, 200);
  assert.deepEqual(wallBand(room, "W", 10).x, -10);
  assert.deepEqual(wallBand(room, "E", 10).x, 300);
  assert.throws(() => wallBand(room, "X", 10), /Unknown wall/);
});

test("opening rect follows the wall axis", () => {
  const north = openingRect(plan, { room: "r", wall: "N", offset: 50, width: 90 }).rect;
  assert.deepEqual(north, { x: 50, y: -10, w: 90, h: 10 });
  const east = openingRect(plan, { room: "r", wall: "E", offset: 20, width: 80 }).rect;
  assert.deepEqual(east, { x: 300, y: 20, w: 10, h: 80 });
  assert.throws(() => openingRect(plan, { room: "nope", wall: "N", offset: 0, width: 1 }), /Unknown room/);
});

test("door swings into or out of the room", () => {
  const { band } = openingRect(plan, { room: "r", wall: "S", offset: 50, width: 90 });
  const inward = doorSwing(band, { swing: "in", hinge: "start", offset: 50, width: 90 });
  const outward = doorSwing(band, { swing: "out", hinge: "start", offset: 50, width: 90 });
  // South wall: inward is up (smaller y), outward is down.
  assert.ok(inward.open[1] < inward.hinge[1]);
  assert.ok(outward.open[1] > outward.hinge[1]);
  assert.equal(inward.hinge[0], 50);
  assert.equal(doorSwing(band, { swing: "in", hinge: "end", offset: 50, width: 90 }).hinge[0], 140);
});

test("plan bounds include outer walls and padding", () => {
  assert.deepEqual(planBounds(plan, 0, 0), { minX: -10, minY: -10, maxX: 310, maxY: 210 });
});
