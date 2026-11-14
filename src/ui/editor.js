import { cm2ToM2, formatM2 } from "../lib/areas.js";
import {
  SWING_OPTIONS, WALL_OPTIONS, distanceFrom, hingeOptions,
  newDoor, newRoom, newWindow, openingsOf, removeRoom,
} from "../lib/plan-model.js";
import { icons } from "./icons.js";

/** Tiny DOM helper: h("div", { class: "x" }, child1, child2). */
function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v === true ? "" : v);
  }
  children.flat().forEach((c) => c != null && node.append(c));
  return node;
}

function fillSelect(select, options, value) {
  select.replaceChildren(...options.map((o) => h("option", { value: o.value, text: o.label })));
  select.value = value;
}

function field(labelText, control, hint) {
  return h("label", { class: "field" },
    h("span", { class: "field-label", text: labelText }),
    control,
    hint ?? null,
  );
}

/**
 * Builds the form editor: one card per room, door and window.
 *
 * containers : { rooms, doors, windows } – elements to fill
 * getPlan()  : returns the current plan object (edited in place)
 * onChange() : called after every edit
 * onHover(t) : called with { type: "room"|"door"|"window", id|index } or null
 *
 * Returns { rebuild, focusRoom }.
 */
export function mountEditor(containers, { getPlan, onChange, onHover = () => {} }) {
  const roomOptions = () => getPlan().rooms.map((r) => ({ value: r.id, label: r.name || "(unnamed)" }));

  function refreshRoomSelects() {
    document.querySelectorAll("select[data-room-select]").forEach((sel) => {
      fillSelect(sel, roomOptions(), sel.value);
    });
  }

  // ---------- inputs ----------
  function numberInput(obj, key, { min, onInput } = {}) {
    const input = h("input", { type: "number", inputmode: "decimal", step: "1", min, value: obj[key] });
    input.addEventListener("input", () => {
      obj[key] = input.valueAsNumber;
      onInput?.();
      onChange();
    });
    input.addEventListener("focus", () => input.select());
    return input;
  }

  function textInput(obj, key, { placeholder, onInput, cls } = {}) {
    const input = h("input", { type: "text", class: cls, value: obj[key] ?? "", placeholder, spellcheck: "false" });
    input.addEventListener("input", () => {
      if (input.value === "") delete obj[key];
      else obj[key] = input.value;
      onInput?.();
      onChange();
    });
    return input;
  }

  function selectInput(obj, key, options, { onInput, isRoom = false } = {}) {
    const select = h("select", isRoom ? { "data-room-select": "" } : {});
    fillSelect(select, options, obj[key]);
    select.addEventListener("change", () => {
      obj[key] = select.value;
      onInput?.();
      onChange();
    });
    return select;
  }

  const deleteButton = (onClick) =>
    h("button", { type: "button", class: "icon-btn danger", title: "Remove", "aria-label": "Remove", html: icons.trash, onclick: onClick });

  const hoverable = (card, target) => {
    card.addEventListener("pointerenter", () => onHover(target));
    card.addEventListener("pointerleave", () => onHover(null));
    card.addEventListener("focusin", () => onHover(target));
    card.addEventListener("focusout", () => onHover(null));
    return card;
  };

  const addButton = (text, onClick, disabled = false) =>
    h("button", { type: "button", class: "add-btn", html: `${icons.plus}<span>${text}</span>`, onclick: onClick, disabled });

  const emptyNote = (text) => h("p", { class: "empty", text });

  // ---------- rooms ----------
  function roomCard(room) {
    const area = h("span", { class: "badge" });
    const updateArea = () => {
      area.textContent = Number.isFinite(room.w * room.h) ? `${formatM2(cm2ToM2(room.w, room.h))} m²` : "–";
    };
    updateArea();

    const outdoor = h("input", { type: "checkbox" });
    outdoor.checked = !!room.outdoor;
    outdoor.addEventListener("change", () => {
      if (outdoor.checked) room.outdoor = true; else delete room.outdoor;
      onChange();
    });

    const card = h("article", { class: "item", "data-room-card": room.id },
      h("header", { class: "item-head" },
        textInput(room, "name", { cls: "name-input", placeholder: "Room name", onInput: refreshRoomSelects }),
        area,
        deleteButton(() => {
          const plan = getPlan();
          const used = openingsOf(plan, room.id);
          if (used && !window.confirm(`"${room.name}" has ${used} door(s)/window(s). Remove them too?`)) return;
          removeRoom(plan, room.id);
          onHover(null);
          rebuild();
          onChange();
        }),
      ),
      h("div", { class: "fields cols-2" },
        field("Width (cm)", numberInput(room, "w", { min: 1, onInput: updateArea })),
        field("Depth (cm)", numberInput(room, "h", { min: 1, onInput: updateArea })),
      ),
      h("div", { class: "fields cols-2" },
        field("Left (cm)", numberInput(room, "x")),
        field("Top (cm)", numberInput(room, "y")),
      ),
      h("div", { class: "fields cols-2 bottom" },
        field("Same room as", textInput(room, "group", { placeholder: "optional" }),
          h("span", { class: "field-hint", text: "Same text = one room" })),
        h("label", { class: "check" }, outdoor, h("span", { text: "Outdoor (balcony, terrace)" })),
      ),
    );
    return hoverable(card, { type: "room", id: room.id });
  }

  function buildRooms() {
    const plan = getPlan();
    containers.rooms.replaceChildren(
      ...plan.rooms.map(roomCard),
      addButton("Add room", () => { const p = getPlan(); p.rooms.push(newRoom(p)); rebuild(); onChange(); focusRoom(p.rooms.at(-1).id); }),
    );
  }

  // ---------- doors & windows ----------
  function openingCard(kind, o, index, { isDoor }) {
    const from = h("span", { class: "field-hint" });
    const hingeSelect = isDoor ? h("select") : null;

    const sync = () => {
      from.textContent = `from the ${distanceFrom(o.wall)}`;
      if (hingeSelect) fillSelect(hingeSelect, hingeOptions(o.wall), o.hinge === "end" ? "end" : "start");
    };
    hingeSelect?.addEventListener("change", () => { o.hinge = hingeSelect.value; onChange(); });

    const card = h("article", { class: "item" },
      h("header", { class: "item-head" },
        selectInput(o, "room", roomOptions(), { isRoom: true }),
        deleteButton(() => {
          const plan = getPlan();
          plan[kind] = plan[kind].filter((x) => x !== o);
          onHover(null);
          rebuild();
          onChange();
        }),
      ),
      h("div", { class: "fields cols-3" },
        field("Wall", selectInput(o, "wall", WALL_OPTIONS, { onInput: sync })),
        field("Starts at (cm)", numberInput(o, "offset", { min: 0 }), from),
        field("Width (cm)", numberInput(o, "width", { min: 1 })),
      ),
      isDoor
        ? h("div", { class: "fields cols-2" },
          field("Opens", selectInput(o, "swing", SWING_OPTIONS)),
          field("Hinges on", hingeSelect),
        )
        : null,
      isDoor
        ? h("div", { class: "fields" }, field("Label on plan", textInput(o, "label", { placeholder: "optional, e.g. Entrance" })))
        : null,
    );
    sync();
    return hoverable(card, { type: isDoor ? "door" : "window", index });
  }

  function buildOpenings(kind, container, { isDoor, addLabel, make, emptyText }) {
    const plan = getPlan();
    const list = plan[kind];
    container.replaceChildren(
      ...(list.length ? list.map((o, i) => openingCard(kind, o, i, { isDoor })) : [emptyNote(emptyText)]),
      addButton(addLabel, () => { const p = getPlan(); p[kind].push(make(p)); rebuild(); onChange(); }, plan.rooms.length === 0),
    );
  }

  // ---------- public ----------
  function rebuild() {
    buildRooms();
    buildOpenings("doors", containers.doors, { isDoor: true, addLabel: "Add door", make: newDoor, emptyText: "No doors yet." });
    buildOpenings("windows", containers.windows, { isDoor: false, addLabel: "Add window", make: newWindow, emptyText: "No windows yet." });
  }

  /** Scrolls to a room's card, flashes it and focuses its name. */
  function focusRoom(id) {
    const card = containers.rooms.querySelector(`[data-room-card="${CSS.escape(id)}"]`);
    if (!card) return;
    card.scrollIntoView({ block: "center", behavior: "smooth" });
    card.classList.remove("flash");
    void card.offsetWidth; // restart the animation
    card.classList.add("flash");
    card.querySelector("input")?.focus({ preventScroll: true });
  }

  rebuild();
  return { rebuild, focusRoom };
}
