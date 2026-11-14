/** Area calculations. Room sizes are in cm, areas in m². */

export const cm2ToM2 = (w, h) => (w * h) / 10000;

/**
 * Rooms that share the same `group` are one room made of several rectangles (e.g. an L-shape).
 * Returns one entry per real room: { name, parts, note, outdoor, m2, main }.
 * `main` is the largest part (used for the label on the drawing).
 */
export function groupRooms(plan) {
  const map = new Map();
  for (const r of plan.rooms) {
    const key = r.group || r.id;
    if (!map.has(key)) map.set(key, { name: r.group || r.name, parts: [], note: "", outdoor: !!r.outdoor });
    const entry = map.get(key);
    entry.parts.push(r);
    if (r.note) entry.note += (entry.note ? " · " : "") + r.note;
  }
  return [...map.values()].map((e) => ({
    ...e,
    m2: e.parts.reduce((s, r) => s + cm2ToM2(r.w, r.h), 0),
    main: e.parts.reduce((a, b) => (a.w * a.h >= b.w * b.h ? a : b)),
  }));
}

export function totals(entries) {
  const sum = (list) => list.reduce((s, e) => s + e.m2, 0);
  const indoor = entries.filter((e) => !e.outdoor);
  const outdoor = entries.filter((e) => e.outdoor);
  return { indoor: sum(indoor), outdoor: sum(outdoor), grand: sum(entries) };
}

export const formatM2 = (n) =>
  n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
