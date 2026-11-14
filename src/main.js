import "./styles.css";
import defaultPlan from "./config/default-plan.json";
import { normalize, validateStructure, layoutWarnings } from "./lib/validate.js";
import { clearSaved, loadSaved, save } from "./lib/storage.js";
import { renderPlan } from "./ui/render-plan.js";
import { renderAreas, renderWarnings } from "./ui/render-table.js";

const $ = (id) => document.getElementById(id);
const els = {
  svg: $("plan"),
  areas: $("areas"),
  warn: $("warn"),
  cfg: $("cfg"),
  status: $("status"),
  copy: $("copy"),
  reset: $("reset"),
  print: $("print"),
};

const defaultText = JSON.stringify(defaultPlan, null, 2);

function setStatus(ok, text) {
  els.status.className = ok ? "ok" : "err";
  els.status.textContent = text;
}

function apply(text, persist) {
  try {
    const plan = normalize(JSON.parse(text));
    const errors = validateStructure(plan);
    if (errors.length) throw new Error(errors[0]);

    renderPlan(els.svg, plan);
    renderAreas(els.areas, plan);
    renderWarnings(els.warn, layoutWarnings(plan));
    document.title = `${plan.title} – Floor plan`;

    if (persist) save(text);
    setStatus(true, persist ? "✓ saved in this browser" : "✓ loaded");
  } catch (e) {
    setStatus(false, `✗ ${e.message}`);
  }
}

els.cfg.value = loadSaved() ?? defaultText;
els.cfg.addEventListener("input", (e) => apply(e.target.value, true));
els.reset.addEventListener("click", () => {
  clearSaved();
  els.cfg.value = defaultText;
  apply(defaultText, false);
});
els.copy.addEventListener("click", async () => {
  await navigator.clipboard.writeText(els.cfg.value);
  setStatus(true, "✓ copied");
});
els.print.addEventListener("click", () => window.print());

apply(els.cfg.value, false);
