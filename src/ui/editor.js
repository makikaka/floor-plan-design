import { cm2ToM2, formatM2 } from "../lib/areas.js";
import {
  SWING_OPTIONS, WALL_OPTIONS, distanceFrom, hingeOptions,
  newDoor, newRoom, newWindow, openingsOf, removeRoom,
} from "../lib/plan-model.js";

/** Tiny DOM helper: h("input", { type: "number" }, child1, child2). */
function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null) node.setAttribute(k, v);
  }
  children.flat().forEach((c) => c != null && node.append(c));
  return node;
}

function fillSelect(select, options, value) {
  select.replaceChildren(...options.map((o) => h("option", { value: o.value, text: o.label })));
  select.value = value;
}

/**
 * Builds the form-based editor (tables of rooms, doors and windows).
 * `getPlan()` returns the current plan object, `onChange()` is called after any edit.
 * Returns `{ rebuild }` – call it after the whole plan has been replaced (open file / reset).
 */
export function mountEditor(root, { getPlan, onChange }) {
  const roomOptions = () => getPlan().rooms.map((r) => ({ value: r.id, label: r.name || "(unnamed)" }));

  function refreshRoomSelects() {
    root.querySelectorAll("select[data-room-select]").forEach((sel) => {
      const keep = sel.value;
      fillSelect(sel, roomOptions(), keep);
    });
  }

  function numberField(obj, key, { min, onInput, width = "5.5em" } = {}) {
    const input = h("input", { type: "number", step: "1", min, value: obj[key], style: `width:${width}` });
    input.addEventListener("input", () => {
      obj[key] = input.valueAsNumber;
      onInput?.();
      onChange();
    });
    return input;
  }

  function textField(obj, key, { placeholder, onInput, width = "9em" } = {}) {
    const input = h("input", { type: "text", value: obj[key] ?? "", placeholder, style: `width:${width}` });
    input.addEventListener("input", () => {
      if (input.value === "") delete obj[key];
      else obj[key] = input.value;
      onInput?.();
      onChange();
    });
    return input;
  }

  function selectField(obj, key, options, { onInput, isRoom = false } = {}) {
    const select = h("select", isRoom ? { "data-room-select": "" } : {});
    fillSelect(select, options, obj[key]);
    select.addEventListener("change", () => {
      obj[key] = select.value;
      onInput?.();
      onChange();
    });
    return select;
  }

  const deleteButton = (onClick) => h("button", { type: "button", class: "icon", title: "Remove", "aria-label": "Remove", text: "✕", onclick: onClick });

  // ---------- Rooms ----------
  function roomsSection() {
    const tbody = h("tbody");

    const addRow = (room) => {
      const area = h("span", { class: "area" });
      const updateArea = () => {
        area.textContent = Number.isFinite(room.w * room.h) ? formatM2(cm2ToM2(room.w, room.h)) : "–";
      };
      updateArea();

      const tr = h("tr", {},
        h("td", {}, textField(room, "name", { width: "10em", onInput: refreshRoomSelects })),
        h("td", {}, numberField(room, "w", { min: 1, onInput: updateArea })),
        h("td", {}, numberField(room, "h", { min: 1, onInput: updateArea })),
        h("td", {}, numberField(room, "x")),
        h("td", {}, numberField(room, "y")),
        h("td", {}, textField(room, "group", { placeholder: "optional", width: "12em" })),
        h("td", { class: "center" }, (() => {
          const box = h("input", { type: "checkbox" });
          box.checked = !!room.outdoor;
          box.addEventListener("change", () => {
            if (box.checked) room.outdoor = true; else delete room.outdoor;
            onChange();
          });
          return box;
        })()),
        h("td", { class: "num" }, area),
        h("td", {}, deleteButton(() => {
          const plan = getPlan();
          const used = openingsOf(plan, room.id);
          if (used && !window.confirm(`"${room.name}" has ${used} door(s)/window(s). Remove them too?`)) return;
          removeRoom(plan, room.id);
          rebuild();
          onChange();
        })),
      );
      tbody.append(tr);
    };

    getPlan().rooms.forEach(addRow);

    return section(
      "Rooms",
      "Width and depth are the inside measurements. “Left / top” place the room on the drawing: leave a 10 cm gap between neighbouring rooms for the wall.",
      h("table", { class: "grid" },
        h("thead", {}, h("tr", {},
          h("th", { text: "Name" }), h("th", { text: "Width (cm)" }), h("th", { text: "Depth (cm)" }),
          h("th", { text: "Left (cm)" }), h("th", { text: "Top (cm)" }),
          h("th", { text: "Same room as", title: "Rooms with the same text here count as one room (e.g. an L-shape)" }),
          h("th", { text: "Outdoor" }), h("th", { text: "m²" }), h("th"))),
        tbody),
      h("button", {
        type: "button", text: "+ Add room",
        onclick: () => { const p = getPlan(); p.rooms.push(newRoom(p)); rebuild(); onChange(); },
      }),
    );
  }

  // ---------- Doors & windows ----------
  function openingRows(kind, list, { withDoorFields }) {
    const tbody = h("tbody");

    list.forEach((o) => {
      const from = h("span", { class: "from" });
      const hingeSelect = withDoorFields ? h("select") : null;

      const sync = () => {
        from.textContent = `from ${distanceFrom(o.wall)}`;
        if (hingeSelect) fillSelect(hingeSelect, hingeOptions(o.wall), o.hinge === "end" ? "end" : "start");
      };

      if (hingeSelect) {
        hingeSelect.addEventListener("change", () => { o.hinge = hingeSelect.value; onChange(); });
      }

      const cells = [
        h("td", {}, selectField(o, "room", roomOptions(), { isRoom: true })),
        h("td", {}, selectField(o, "wall", WALL_OPTIONS, { onInput: sync })),
        h("td", { class: "nowrap" }, numberField(o, "offset", { min: 0 }), " ", from),
        h("td", {}, numberField(o, "width", { min: 1 })),
      ];
      if (withDoorFields) {
        cells.push(
          h("td", {}, selectField(o, "swing", SWING_OPTIONS)),
          h("td", {}, hingeSelect),
          h("td", {}, textField(o, "label", { placeholder: "optional", width: "8em" })),
        );
      }
      cells.push(h("td", {}, deleteButton(() => {
        const plan = getPlan();
        plan[kind] = plan[kind].filter((x) => x !== o);
        rebuild();
        onChange();
      })));

      sync();
      tbody.append(h("tr", {}, ...cells));
    });
    return tbody;
  }

  function doorsSection() {
    const plan = getPlan();
    return section(
      "Doors",
      "Pick the room and the wall the door is in, then how far from the corner the door starts. Choose where it opens and which side the hinges are on.",
      h("table", { class: "grid" },
        h("thead", {}, h("tr", {},
          h("th", { text: "Room" }), h("th", { text: "Wall" }), h("th", { text: "Starts at (cm)" }), h("th", { text: "Width (cm)" }),
          h("th", { text: "Opens" }), h("th", { text: "Hinges on" }), h("th", { text: "Label" }), h("th"))),
        openingRows("doors", plan.doors, { withDoorFields: true })),
      h("button", {
        type: "button", text: "+ Add door", disabled: plan.rooms.length ? null : "",
        onclick: () => { const p = getPlan(); p.doors.push(newDoor(p)); rebuild(); onChange(); },
      }),
    );
  }

  function windowsSection() {
    const plan = getPlan();
    return section(
      "Windows",
      null,
      h("table", { class: "grid" },
        h("thead", {}, h("tr", {},
          h("th", { text: "Room" }), h("th", { text: "Wall" }), h("th", { text: "Starts at (cm)" }), h("th", { text: "Width (cm)" }), h("th"))),
        openingRows("windows", plan.windows, { withDoorFields: false })),
      h("button", {
        type: "button", text: "+ Add window", disabled: plan.rooms.length ? null : "",
        onclick: () => { const p = getPlan(); p.windows.push(newWindow(p)); rebuild(); onChange(); },
      }),
    );
  }

  function section(title, hint, table, addButton) {
    return h("div", { class: "section" },
      h("h3", { text: title }),
      hint ? h("p", { class: "muted small", text: hint }) : null,
      h("div", { class: "scroll" }, table),
      addButton,
    );
  }

  function rebuild() {
    root.replaceChildren(roomsSection(), doorsSection(), windowsSection());
  }

  rebuild();
  return { rebuild };
}
