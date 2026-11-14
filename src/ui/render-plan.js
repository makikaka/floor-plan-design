import { doorSwing, openingRect, planBounds } from "../lib/geometry.js";
import { formatM2, groupRooms } from "../lib/areas.js";

const NS = "http://www.w3.org/2000/svg";
const COLORS = {
  wall: "#2b3440",
  floor: "#ffffff",
  outdoor: "#e6f2e1",
  window: "#8fd0f5",
  door: "#2f6fed",
  ink: "#1f2933",
  muted: "#52606d",
  faint: "#8a96a3",
  grid: "#eceff3",
};

function el(tag, attrs, parent, text) {
  const node = document.createElementNS(NS, tag);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  if (text != null) node.textContent = text;
  if (parent) parent.appendChild(node);
  return node;
}

function label(parent, x, y, text, size, fill, bold = false) {
  return el(
    "text",
    {
      x, y, "font-size": size, fill, "text-anchor": "middle",
      "font-weight": bold ? 700 : 400,
      "font-family": "-apple-system, Helvetica, Arial, sans-serif",
    },
    parent,
    text,
  );
}

/** Draws the whole plan into an <svg> element. */
export function renderPlan(svg, plan) {
  const T = plan.wall;
  svg.replaceChildren();

  const { minX, minY, maxX, maxY } = planBounds(plan);
  svg.setAttribute("viewBox", [minX, minY, maxX - minX, maxY - minY].join(" "));

  drawGrid(svg, { minX, minY, maxX, maxY });

  // Walls are the dark under-layer; room floors are drawn on top, so gaps stay dark.
  const walls = el("g", { fill: COLORS.wall }, svg);
  plan.rooms.forEach((r) =>
    el("rect", { x: r.x - T, y: r.y - T, width: r.w + 2 * T, height: r.h + 2 * T }, walls));
  plan.rooms.forEach((r) =>
    el("rect", { x: r.x, y: r.y, width: r.w, height: r.h, fill: r.outdoor ? COLORS.outdoor : COLORS.floor }, svg));

  plan.windows.forEach((o) => drawWindow(svg, plan, o));
  plan.doors.forEach((o) => drawDoor(svg, plan, o));
  drawRoomLabels(svg, plan);
  drawScaleBar(svg, { minX, minY, maxX, maxY });
}

function drawGrid(svg, { minX, minY, maxX, maxY }) {
  const g = el("g", { stroke: COLORS.grid, "stroke-width": 1 }, svg);
  for (let x = Math.ceil(minX / 100) * 100; x <= maxX; x += 100) el("line", { x1: x, y1: minY, x2: x, y2: maxY }, g);
  for (let y = Math.ceil(minY / 100) * 100; y <= maxY; y += 100) el("line", { x1: minX, y1: y, x2: maxX, y2: y }, g);
}

function drawWindow(svg, plan, o) {
  const { rect } = openingRect(plan, o);
  el("rect", {
    x: rect.x, y: rect.y, width: rect.w, height: rect.h,
    fill: COLORS.window, stroke: COLORS.wall, "stroke-width": 1,
  }, svg);
}

function drawDoor(svg, plan, o) {
  const { band, rect } = openingRect(plan, o);
  el("rect", { x: rect.x, y: rect.y, width: rect.w, height: rect.h, fill: COLORS.floor }, svg);

  if (o.swing === "none") {
    if (o.label) label(svg, rect.x + rect.w / 2, rect.y + rect.h / 2 + 4, o.label, 11, COLORS.door);
    return;
  }

  const { hinge, free, open, radius, sweep } = doorSwing(band, o);
  el("path", {
    d: `M${free[0]},${free[1]} A${radius},${radius} 0 0 ${sweep} ${open[0]},${open[1]}`,
    fill: "none", stroke: COLORS.door, "stroke-width": 1.5, "stroke-dasharray": "5 3",
  }, svg);
  el("line", {
    x1: hinge[0], y1: hinge[1], x2: open[0], y2: open[1],
    stroke: COLORS.door, "stroke-width": 3,
  }, svg);
  if (o.label) {
    label(svg, (free[0] + open[0] + hinge[0]) / 3, (free[1] + open[1] + hinge[1]) / 3, o.label, 11, COLORS.door);
  }
}

function drawRoomLabels(svg, plan) {
  const entries = groupRooms(plan);
  for (const r of plan.rooms) {
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const entry = entries.find((e) => e.parts.includes(r));

    if (entry.parts.length === 1 || entry.main === r) {
      const size = entry.parts.length > 1 ? `${r.w} × ${r.h}  (part 1 of ${entry.parts.length})` : `${r.w} × ${r.h}`;
      label(svg, cx, cy - 8, entry.name, 18, COLORS.ink, true);
      label(svg, cx, cy + 14, size, 14, COLORS.muted);
      label(svg, cx, cy + 32, `${formatM2(entry.m2)} m²`, 14, COLORS.door, true);
    } else {
      label(svg, cx, cy, `${r.w} × ${r.h}  (${entry.name})`, 12, COLORS.muted);
    }

    // Edge dimensions
    label(svg, cx, r.y + 15, String(r.w), 12, COLORS.faint);
    const vertical = label(svg, r.x + 15, cy, String(r.h), 12, COLORS.faint);
    vertical.setAttribute("transform", `rotate(-90 ${r.x + 15} ${cy})`);
  }
}

function drawScaleBar(svg, { minX, minY, maxX, maxY }) {
  const sx = minX + 20;
  const sy = maxY - 25;
  el("line", { x1: sx, y1: sy, x2: sx + 100, y2: sy, stroke: COLORS.ink, "stroke-width": 3 }, svg);
  label(svg, sx + 50, sy - 8, "1 m", 12, COLORS.ink);
  label(svg, minX + (maxX - minX) / 2, minY + 22, "N ↑", 14, "#6b7785", true);
}
