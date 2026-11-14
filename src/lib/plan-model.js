/**
 * Pure helpers for changing a plan from the editor (add / remove rows, labels).
 * These work on the plain plan object and never touch the DOM.
 */

export const WALL_OPTIONS = [
  { value: "N", label: "Top" },
  { value: "E", label: "Right" },
  { value: "S", label: "Bottom" },
  { value: "W", label: "Left" },
];

export const SWING_OPTIONS = [
  { value: "in", label: "Opens into the room" },
  { value: "out", label: "Opens out of the room" },
  { value: "none", label: "Open passage (no door)" },
];

const isHorizontalWall = (wall) => wall === "N" || wall === "S";

/** Where the distance on a wall is measured from. */
export const distanceFrom = (wall) => (isHorizontalWall(wall) ? "left corner" : "top corner");

/** Hinge side choices, worded for the chosen wall. */
export function hingeOptions(wall) {
  return isHorizontalWall(wall)
    ? [{ value: "start", label: "Left side" }, { value: "end", label: "Right side" }]
    : [{ value: "start", label: "Top side" }, { value: "end", label: "Bottom side" }];
}

/** Next free id such as "room-3", "door-1". */
export function nextId(prefix, existing) {
  const used = new Set(existing);
  let n = 1;
  while (used.has(`${prefix}-${n}`)) n += 1;
  return `${prefix}-${n}`;
}

export function newRoom(plan) {
  const right = plan.rooms.length ? Math.max(...plan.rooms.map((r) => r.x + r.w)) : 0;
  return {
    id: nextId("room", plan.rooms.map((r) => r.id)),
    name: "New room",
    x: plan.rooms.length ? right + plan.wall : 0,
    y: 0,
    w: 300,
    h: 300,
  };
}

export function newDoor(plan) {
  return { room: plan.rooms[0]?.id ?? "", wall: "S", offset: 20, width: 90, swing: "in", hinge: "start", label: "" };
}

export function newWindow(plan) {
  return { room: plan.rooms[0]?.id ?? "", wall: "N", offset: 20, width: 120 };
}

/** How many doors and windows belong to a room. */
export function openingsOf(plan, roomId) {
  return [...plan.doors, ...plan.windows].filter((o) => o.room === roomId).length;
}

/** Removes a room together with its doors and windows. */
export function removeRoom(plan, roomId) {
  plan.rooms = plan.rooms.filter((r) => r.id !== roomId);
  plan.doors = plan.doors.filter((o) => o.room !== roomId);
  plan.windows = plan.windows.filter((o) => o.room !== roomId);
}
