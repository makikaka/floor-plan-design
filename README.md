# Floor plan design

An editable, to-scale floor plan. Fill in rooms, doors and windows in simple forms and the app draws the plan, shows door swings and calculates the m² of every room and the total.

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

Everything is edited in the page, no code or JSON needed. The drawing and the m² table update as you type, and your changes are kept in the browser.

- **Rooms**: name, width and depth (inside measurements, cm), and where the room sits (`Left` / `Top`). Leave a 10 cm gap between neighbouring rooms for the wall. Tick **Outdoor** for terraces and balconies.
- **Same room as**: give two rectangles the same text to make them one room (for example an L-shape). Their areas are added together.
- **Doors**: pick the room and wall, how far from the corner the door starts, its width, where it opens (into the room, out of it, or an open passage with no door) and which side the hinges are on.
- **Windows**: room, wall, start and width.
- **Save plan to file / Open plan file**: back up a plan or move it to another computer.
- **Start over with example**: loads the example plan.

The app warns you if rooms overlap or a door or window is longer than its wall.

### Changing the example plan shipped with the app

The example plan is [`src/config/default-plan.json`](src/config/default-plan.json). Save your plan to a file in the app and copy its contents over that file to make it the new example.

## Project layout

```
index.html                 page shell
src/
  main.js                  wires the editor, validation and rendering together
  styles.css
  config/default-plan.json the example plan
  lib/
    geometry.js            walls, openings, door swing arcs, bounds (pure)
    areas.js               m² per room, grouping, totals (pure)
    validate.js            defaults, structure errors, layout warnings (pure)
    plan-model.js          add / remove rooms, doors, windows; option labels (pure)
    storage.js             browser localStorage helpers
  ui/
    editor.js              form-based editor (tables of rooms, doors, windows)
    render-plan.js         SVG drawing
    render-table.js        areas table and warnings
tests/                     unit tests for lib/
```
