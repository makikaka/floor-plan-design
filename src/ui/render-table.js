import { formatM2, groupRooms, totals } from "../lib/areas.js";

const escapeHtml = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** Fills a <table> with one row per room plus indoor / outdoor / grand totals. */
export function renderAreas(table, plan) {
  const entries = groupRooms(plan);
  const t = totals(entries);
  const indoor = entries.filter((e) => !e.outdoor);
  const outdoor = entries.filter((e) => e.outdoor);

  const row = (e) => `
    <tr>
      <td>${escapeHtml(e.name)}${e.note ? `<div class="note">${escapeHtml(e.note)}</div>` : ""}</td>
      <td class="size">${e.parts.map((p) => `${p.w} × ${p.h}`).join(" + ")}</td>
      <td class="m2">${formatM2(e.m2)}</td>
    </tr>`;

  table.innerHTML = `
    <thead><tr><th>Room</th><th>Size cm</th><th>m²</th></tr></thead>
    <tbody>
      ${indoor.map(row).join("")}
      <tr class="sub"><td colspan="2">Indoor total</td><td class="m2">${formatM2(t.indoor)}</td></tr>
      ${outdoor.length ? outdoor.map(row).join("") + `<tr class="sub"><td colspan="2">Outdoor total</td><td class="m2">${formatM2(t.outdoor)}</td></tr>` : ""}
      <tr class="total"><td colspan="2">Grand total</td><td class="m2">${formatM2(t.grand)}</td></tr>
    </tbody>`;
}

/** Small totals chips shown over the plan. */
export function renderChips(box, plan) {
  const t = totals(groupRooms(plan));
  const chip = (label, value, cls = "") =>
    `<span class="chip ${cls}"><span class="chip-label">${label}</span><b>${formatM2(value)} m²</b></span>`;
  box.innerHTML =
    chip("Indoor", t.indoor, "main") +
    (t.outdoor > 0 ? chip("Outdoor", t.outdoor) : "") +
    chip("Total", t.grand);
}

export function renderWarnings(box, messages) {
  box.hidden = messages.length === 0;
  box.innerHTML = messages.length
    ? `<b>Check your measurements</b><ul>${messages.map((m) => `<li>${escapeHtml(m)}</li>`).join("")}</ul>`
    : "";
}
