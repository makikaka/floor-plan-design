import { WALLS } from "./geometry.js";

const SWINGS = ["in", "out", "none"];
const HINGES = ["start", "end"];

/**
 * Fills in defaults. Does not mutate the input.
 */
export function normalize(raw) {
  return {
    title: "Floor plan",
    wall: 10,
    doors: [],
    windows: [],
    ...raw,
  };
}

/**
 * Checks that the plan can be drawn.
 * Returns a list of error messages; an empty list means the plan is valid.
 */
export function validateStructure(plan) {
  const errors = [];
  if (!Array.isArray(plan.rooms) || plan.rooms.length === 0) {
    return ['"rooms" must be a non-empty list'];
  }
  if (!(plan.wall >= 0)) errors.push('"wall" must be a number >= 0');

  const ids = new Set();
  plan.rooms.forEach((r, i) => {
    const where = `rooms[${i}]${r.name ? ` (${r.name})` : ""}`;
    if (!r.id) errors.push(`${where}: missing "id"`);
    else if (ids.has(r.id)) errors.push(`${where}: duplicate id "${r.id}"`);
    ids.add(r.id);
    for (const k of ["x", "y", "w", "h"]) {
      if (typeof r[k] !== "number" || Number.isNaN(r[k])) errors.push(`${where}: "${k}" must be a number`);
    }
    if (r.w <= 0 || r.h <= 0) errors.push(`${where}: "w" and "h" must be greater than 0`);
  });

  const checkOpening = (kind, o, i) => {
    const where = `${kind}[${i}]`;
    if (!ids.has(o.room)) errors.push(`${where}: unknown room "${o.room}"`);
    if (!WALLS.includes(o.wall)) errors.push(`${where}: "wall" must be N, E, S or W`);
    if (typeof o.offset !== "number" || typeof o.width !== "number") errors.push(`${where}: "offset" and "width" must be numbers`);
    if (kind === "doors") {
      if (!SWINGS.includes(o.swing)) errors.push(`${where}: "swing" must be in, out or none`);
      if (o.hinge && !HINGES.includes(o.hinge)) errors.push(`${where}: "hinge" must be start or end`);
    }
  };
  (plan.doors || []).forEach((o, i) => checkOpening("doors", o, i));
  (plan.windows || []).forEach((o, i) => checkOpening("windows", o, i));

  return errors;
}

/**
 * Sanity checks for a structurally valid plan. Returns human readable warnings.
 */
export function layoutWarnings(plan) {
  const T = plan.wall;
  const R = plan.rooms;
  const msgs = [];

  for (let i = 0; i < R.length; i++) {
    for (let j = i + 1; j < R.length; j++) {
      const a = R[i];
      const b = R[j];
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > -T && oy > -T) {
        msgs.push(`"${a.name}" and "${b.name}" overlap or are closer than the wall thickness (${T}).`);
      }
    }
  }

  for (const o of [...(plan.doors || []), ...(plan.windows || [])]) {
    const room = R.find((r) => r.id === o.room);
    if (!room) continue;
    const len = o.wall === "N" || o.wall === "S" ? room.w : room.h;
    if (o.offset < 0 || o.offset + o.width > len) {
      msgs.push(`Opening on ${room.name} ${o.wall} wall (offset ${o.offset}, width ${o.width}) is longer than the wall (${len}).`);
    }
  }
  return msgs;
}
