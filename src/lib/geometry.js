/**
 * Pure geometry helpers. Everything is in centimetres.
 * Coordinates: x grows to the right, y grows downward (same as SVG).
 */

export const WALLS = ["N", "E", "S", "W"];

/**
 * Wall band of a room.
 * `a` = unit vector along the wall, `n` = unit vector pointing into the room,
 * `p` = start point of the wall's centre line.
 */
export function wallBand(room, wall, T) {
  const { x, y, w, h } = room;
  switch (wall) {
    case "N": return { x, y: y - T, w, h: T, a: [1, 0], n: [0, 1], p: [x, y - T / 2], len: w };
    case "S": return { x, y: y + h, w, h: T, a: [1, 0], n: [0, -1], p: [x, y + h + T / 2], len: w };
    case "W": return { x: x - T, y, w: T, h, a: [0, 1], n: [1, 0], p: [x - T / 2, y], len: h };
    case "E": return { x: x + w, y, w: T, h, a: [0, 1], n: [-1, 0], p: [x + w + T / 2, y], len: h };
    default: throw new Error(`Unknown wall '${wall}' (use N, E, S or W)`);
  }
}

/** Rectangle that a door/window cuts out of its wall. */
export function openingRect(plan, o) {
  const room = plan.rooms.find((r) => r.id === o.room);
  if (!room) throw new Error(`Unknown room id '${o.room}'`);
  const band = wallBand(room, o.wall, plan.wall);
  const rect = band.a[0] === 1
    ? { x: band.x + o.offset, y: band.y, w: o.width, h: band.h }
    : { x: band.x, y: band.y + o.offset, w: band.w, h: o.width };
  return { band, rect, room };
}

/**
 * Swing arc of a door.
 * Returns the hinge point, the free end of the closed leaf, the end of the open leaf
 * and the SVG arc sweep flag. `swing` is "in", "out" or "none".
 */
export function doorSwing(band, o) {
  const dir = o.swing === "out" ? -1 : 1;
  const p0 = [band.p[0] + band.a[0] * o.offset, band.p[1] + band.a[1] * o.offset];
  const p1 = [p0[0] + band.a[0] * o.width, p0[1] + band.a[1] * o.width];
  const hingeAtStart = o.hinge !== "end";
  const hinge = hingeAtStart ? p0 : p1;
  const free = hingeAtStart ? p1 : p0;
  const open = [hinge[0] + band.n[0] * dir * o.width, hinge[1] + band.n[1] * dir * o.width];
  const cross = (free[0] - hinge[0]) * (open[1] - hinge[1]) - (free[1] - hinge[1]) * (open[0] - hinge[0]);
  return { hinge, free, open, radius: o.width, sweep: cross > 0 ? 1 : 0 };
}

/** Bounding box of the whole plan including outer walls and padding. */
export function planBounds(plan, pad = 60, extraBottom = 40) {
  const T = plan.wall;
  const xs0 = plan.rooms.map((r) => r.x - T);
  const ys0 = plan.rooms.map((r) => r.y - T);
  const xs1 = plan.rooms.map((r) => r.x + r.w + T);
  const ys1 = plan.rooms.map((r) => r.y + r.h + T);
  return {
    minX: Math.min(...xs0) - pad,
    minY: Math.min(...ys0) - pad,
    maxX: Math.max(...xs1) + pad,
    maxY: Math.max(...ys1) + pad + extraBottom,
  };
}
