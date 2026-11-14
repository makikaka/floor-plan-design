import "./styles.css";
import examplePlan from "./config/default-plan.json";
import { normalize, validateStructure, layoutWarnings } from "./lib/validate.js";
import { clearSaved, loadSaved, save } from "./lib/storage.js";
import { renderPlan } from "./ui/render-plan.js";
import { renderAreas, renderChips, renderWarnings } from "./ui/render-table.js";
import { mountEditor } from "./ui/editor.js";
import { createViewport } from "./ui/viewport.js";

const $ = (id) => document.getElementById(id);
const els = {
  app: $("app"),
  workspace: $("workspace"),
  svg: $("plan"),
  areas: $("areas"),
  areasPrint: $("areas-print"),
  chips: $("chips"),
  warn: $("warn"),
  title: $("plan-title"),
  status: $("status"),
  saveFile: $("save-file"),
  openFile: $("open-file"),
  fileInput: $("file-input"),
  reset: $("reset"),
  print: $("print"),
  fullscreen: $("fullscreen"),
  toggleSidebar: $("toggle-sidebar"),
};

const clone = (obj) => JSON.parse(JSON.stringify(obj));
const viewport = createViewport(els.svg);

// ---------- state ----------
function readSaved() {
  const text = loadSaved();
  if (!text) return null;
  try { return normalize(JSON.parse(text)); } catch { return null; }
}

let plan = readSaved() ?? normalize(clone(examplePlan));

// ---------- status pill ----------
let statusTimer;
function setStatus(ok, text) {
  els.status.className = `status ${ok ? "ok" : "err"}`;
  els.status.textContent = text;
  clearTimeout(statusTimer);
  if (ok) statusTimer = setTimeout(() => { els.status.textContent = ""; els.status.className = "status"; }, 3000);
}

// ---------- drawing ----------
function updateCounts() {
  document.querySelectorAll("[data-count]").forEach((node) => {
    const n = plan[node.dataset.count]?.length ?? 0;
    node.textContent = n ? String(n) : "";
  });
}

/** Redraws everything from the current plan. Invalid input keeps the last good drawing. */
function refresh({ persist = true } = {}) {
  const errors = validateStructure(plan);
  if (errors.length) {
    setStatus(false, errors[0]);
    return;
  }
  viewport.setBounds(renderPlan(els.svg, plan));
  renderAreas(els.areas, plan);
  renderAreas(els.areasPrint, plan);
  renderChips(els.chips, plan);
  renderWarnings(els.warn, layoutWarnings(plan));
  updateCounts();
  document.title = `${plan.title || "Floor plan design"} – Floor plan design`;
  if (persist) {
    save(JSON.stringify(plan));
    setStatus(true, "Saved in this browser");
  }
}

// ---------- highlight the thing you are editing ----------
function highlight(target) {
  els.svg.querySelectorAll(".hl").forEach((n) => n.classList.remove("hl"));
  if (!target) return;
  const selector = {
    room: `[data-room="${CSS.escape(target.id ?? "")}"]`,
    door: `[data-door="${target.index}"]`,
    window: `[data-window="${target.index}"]`,
  }[target.type];
  els.svg.querySelectorAll(selector).forEach((n) => n.classList.add("hl"));
}

// ---------- tabs ----------
function showTab(name) {
  document.querySelectorAll(".tab").forEach((t) => {
    const active = t.dataset.tab === name;
    t.classList.toggle("is-active", active);
    t.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("is-active", p.dataset.panel === name));
}
document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => showTab(t.dataset.tab)));

// ---------- sidebar ----------
function setSidebar(open) {
  els.workspace.classList.toggle("sidebar-collapsed", !open);
  els.toggleSidebar.setAttribute("aria-pressed", String(!open));
}
const toggleSidebar = () => setSidebar(els.workspace.classList.contains("sidebar-collapsed"));
els.toggleSidebar.addEventListener("click", toggleSidebar);

// ---------- editor ----------
const editor = mountEditor(
  { rooms: $("rooms-editor"), doors: $("doors-editor"), windows: $("windows-editor") },
  { getPlan: () => plan, onChange: () => refresh(), onHover: highlight },
);

// Click a room on the drawing to edit it.
els.svg.addEventListener("click", (e) => {
  if (viewport.wasDragged()) return;
  const room = e.target.closest?.("[data-room]");
  if (!room) return;
  setSidebar(true);
  showTab("rooms");
  editor.focusRoom(room.dataset.room);
});

function replacePlan(next, { persist }) {
  plan = normalize(next);
  els.title.value = plan.title ?? "";
  highlight(null);
  editor.rebuild();
  viewport.fit();
  refresh({ persist });
}

// ---------- header actions ----------
els.title.value = plan.title ?? "";
els.title.addEventListener("input", () => { plan.title = els.title.value; refresh(); });

els.reset.addEventListener("click", () => {
  if (!window.confirm("Replace the current plan with the example plan?")) return;
  clearSaved();
  replacePlan(clone(examplePlan), { persist: false });
  setStatus(true, "Example plan loaded");
});

els.saveFile.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  const name = (plan.title || "floor-plan").trim().replace(/[^\w-]+/g, "-").toLowerCase() || "floor-plan";
  link.href = URL.createObjectURL(blob);
  link.download = `${name}.floorplan.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  setStatus(true, "Plan file downloaded");
});

els.openFile.addEventListener("click", () => els.fileInput.click());
els.fileInput.addEventListener("change", async () => {
  const file = els.fileInput.files[0];
  els.fileInput.value = "";
  if (!file) return;
  try {
    const next = normalize(JSON.parse(await file.text()));
    const errors = validateStructure(next);
    if (errors.length) throw new Error(errors[0]);
    replacePlan(next, { persist: true });
  } catch (e) {
    setStatus(false, `Could not open file: ${e.message}`);
  }
});

els.print.addEventListener("click", () => window.print());

// ---------- zoom buttons ----------
$("zoom-in").addEventListener("click", viewport.zoomIn);
$("zoom-out").addEventListener("click", viewport.zoomOut);
$("zoom-fit").addEventListener("click", viewport.fit);

// ---------- full screen ----------
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
}
if (!document.fullscreenEnabled) els.fullscreen.hidden = true;
els.fullscreen.addEventListener("click", toggleFullscreen);
document.addEventListener("fullscreenchange", () => {
  els.app.classList.toggle("is-fullscreen", !!document.fullscreenElement);
});

// ---------- keyboard shortcuts (ignored while typing) ----------
document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target.closest?.("input, select, textarea")) return;
  if (e.key === "f" || e.key === "F") { e.preventDefault(); toggleFullscreen(); }
  if (e.key === "p" || e.key === "P") { e.preventDefault(); toggleSidebar(); }
});

// ---------- go ----------
refresh({ persist: false });
