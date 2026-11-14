# plan-floor-design

An editable, to-scale floor plan. Describe rooms, doors and windows in a small JSON file and the app draws the plan, shows door swings and calculates the m² of every room and the total.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

Other commands:

```bash
npm run build      # static site in dist/
npm run preview    # serve the built site
npm test           # unit tests (node's built-in test runner)
```

Requires Node 20 or newer.

## Editing the plan

Use the text box in the app: the drawing and the m² table update as you type, and your edits are kept in the browser. To make them permanent, click **Copy JSON** and paste the result into [`src/config/default-plan.json`](src/config/default-plan.json).

All sizes are interior (clear) sizes in centimetres. `x` grows to the right, `y` grows downward.

| Key | Meaning |
|---|---|
| `wall` | Wall thickness (cm). The gap between two rooms is drawn as wall. |
| `rooms[]` | `id`, `name`, `x`, `y` (top-left interior corner), `w` (width), `h` (depth). Optional: `outdoor: true` for terraces, `group`, `note`. |
| `rooms[].group` | Rooms with the same `group` are one room made of several rectangles (e.g. an L-shape). Their areas are added together. |
| `doors[]` | `room`, `wall` (`N`/`E`/`S`/`W`), `offset`, `width`, `swing` (`in`, `out`, `none`), `hinge` (`start`, `end`), optional `label`. |
| `windows[]` | `room`, `wall`, `offset`, `width`. |

- `offset` is the distance from the start of the wall (left corner for `N`/`S`, top corner for `E`/`W`) to the start of the opening.
- `swing: "in"` opens into the room the door belongs to, `"out"` away from it, `"none"` is an open passage. Use a wide `none` opening to leave only a short stub of wall between two rooms.
- The app warns you if rooms overlap or an opening is longer than its wall.

## Project layout

```
index.html                 page shell
src/
  main.js                  wires the editor, validation and rendering together
  styles.css
  config/default-plan.json the plan itself
  lib/
    geometry.js            walls, openings, door swing arcs, bounds (pure)
    areas.js               m² per room, grouping, totals (pure)
    validate.js            defaults, structure errors, layout warnings (pure)
    storage.js             browser localStorage helpers
  ui/
    render-plan.js         SVG drawing
    render-table.js        areas table and warnings
tests/                     unit tests for lib/
```
