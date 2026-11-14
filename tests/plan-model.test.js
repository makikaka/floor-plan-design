import test from "node:test";
import assert from "node:assert/strict";
import {
  distanceFrom, hingeOptions, newDoor, newRoom, newWindow, nextId, openingsOf, removeRoom,
} from "../src/lib/plan-model.js";

const makePlan = () => ({
  wall: 10,
  rooms: [
    { id: "a", name: "A", x: 0, y: 0, w: 100, h: 100 },
    { id: "b", name: "B", x: 110, y: 0, w: 200, h: 100 },
  ],
  doors: [{ room: "a", wall: "S", offset: 0, width: 80, swing: "in" }],
  windows: [{ room: "b", wall: "N", offset: 0, width: 80 }, { room: "a", wall: "N", offset: 0, width: 50 }],
});

test("nextId skips used ids", () => {
  assert.equal(nextId("room", []), "room-1");
  assert.equal(nextId("room", ["room-1", "room-2"]), "room-3");
});

test("new room is placed to the right of the others with a wall gap", () => {
  const room = newRoom(makePlan());
  assert.equal(room.x, 320);
  assert.equal(room.y, 0);
  assert.equal(room.id, "room-1");
});

test("new door and window default to the first room", () => {
  const plan = makePlan();
  assert.equal(newDoor(plan).room, "a");
  assert.equal(newWindow(plan).room, "a");
});

test("removing a room removes its doors and windows", () => {
  const plan = makePlan();
  assert.equal(openingsOf(plan, "a"), 2);
  removeRoom(plan, "a");
  assert.deepEqual(plan.rooms.map((r) => r.id), ["b"]);
  assert.equal(plan.doors.length, 0);
  assert.equal(plan.windows.length, 1);
});

test("wall wording follows the wall direction", () => {
  assert.equal(distanceFrom("N"), "left corner");
  assert.equal(distanceFrom("E"), "top corner");
  assert.equal(hingeOptions("S")[0].label, "Left side");
  assert.equal(hingeOptions("W")[1].label, "Bottom side");
});
