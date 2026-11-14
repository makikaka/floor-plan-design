import "./styles.css";
import examplePlan from "./config/default-plan.json";
import { normalize, validateStructure, layoutWarnings } from "./lib/validate.js";
import { clearSaved, loadSaved, save } from "./lib/storage.js";
import { renderPlan } from "./ui/render-plan.js";
import { renderAreas, renderWarnings } from "./ui/render-table.js";
import { mountEditor } from "./ui/editor.js";

const $ = (id) => document.getElementById(id);
const els = {
  svg: $("plan"),
  areas: $("areas"),
  warn: $("warn"),
  editor: $("editor"),
  title: $("plan-title"),
  status: $("status"),
  saveFile: $("save-file"),
  openFile: $("open-file"),
  fileInput: $("file-input"),
  reset: $("reset"),
  print: $("print"),
};

const clone = (obj) => JSON.parse(JSON.stringify(obj));

function readSaved() {
  const text = loadSaved();
  if (!text) return null;
  try { return normalize(JSON.parse(text)); } catch { return null; }
}

let plan = readSaved() ?? normalize(clone(examplePlan));

function setStatus(ok, text) {
  els.status.className = ok ? "ok" : "err";
  els.status.textContent = text;
}

/** Redraws everything from the current plan. Invalid input keeps the last good drawing. */
function refresh({ persist = true } = {}) {
  const errors = validateStructure(plan);
  if (errors.length) {
    setStatus(false, `✗ ${errors[0]}`);
    return;
  }
  renderPlan(els.svg, plan);
  renderAreas(els.areas, plan);
  renderWarnings(els.warn, layoutWarnings(plan));
  document.title = `${plan.title || "Floor plan design"} – Floor plan design`;
  if (persist) {
    save(JSON.stringify(plan));
    setStatus(true, "✓ saved in this browser");
  }
}

const editor = mountEditor(els.editor, { getPlan: () => plan, onChange: () => refresh() });

function replacePlan(next, { persist }) {
  plan = normalize(next);
  els.title.value = plan.title ?? "";
  editor.rebuild();
  refresh({ persist });
}

els.title.value = plan.title ?? "";
els.title.addEventListener("input", () => { plan.title = els.title.value; refresh(); });

els.reset.addEventListener("click", () => {
  if (!window.confirm("Replace the current plan with the example plan?")) return;
  clearSaved();
  replacePlan(clone(examplePlan), { persist: false });
  setStatus(true, "✓ example plan loaded");
});

els.saveFile.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  const name = (plan.title || "floor-plan").trim().replace(/[^\w-]+/g, "-").toLowerCase() || "floor-plan";
  link.href = URL.createObjectURL(blob);
  link.download = `${name}.floorplan.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  setStatus(true, "✓ plan file downloaded");
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
    setStatus(false, `✗ Could not open file: ${e.message}`);
  }
});

els.print.addEventListener("click", () => window.print());

refresh({ persist: false });
setStatus(true, "✓ loaded");
