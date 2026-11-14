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

## Live site (GitHub Pages)

Every push to `main` runs the tests, builds the app and publishes it with the workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

https://makikaka.github.io/floor-plan-design/

One-time setup: in the GitHub repo open **Settings → Pages** and set **Source** to **GitHub Actions**.
On GitHub's free plan Pages only works for **public** repositories.

Plans you edit in the browser are stored in that browser only. Use **Save plan to file** to keep a copy.

## Editing the plan

Everything is edited in the page, no code or JSON needed. The drawing and the m² totals update as you type, and your changes are kept in the browser.

- **Side panel** with tabs for **Rooms**, **Doors**, **Windows** and **Areas**. Each room, door and window is a card with labelled fields.
- **Rooms**: name, width and depth (inside measurements, cm) and where the room sits (`Left` / `Top`). Leave a 10 cm gap between neighbouring rooms for the wall. Tick **Outdoor** for terraces and balconies.
- **Same room as**: give two rectangles the same text to make them one room (for example an L-shape). Their areas are added together.
- **Doors**: pick the room and wall, how far from the corner the door starts, its width, where it opens (into the room, out of it, or an open passage) and which side the hinges are on.
- **Windows**: room, wall, start and width.
- **On the plan**: drag to move, scroll or use the buttons to zoom, double-click to fit. Click a room to edit it. Hovering a card highlights that room, door or window on the plan.
- **Full screen** button (or press `F`) and a button (or `P`) to hide the side panel and give the plan the whole screen.
- **Save / Open**: back up a plan to a file or move it to another computer. **Example** loads the sample plan. **Print** gives a plan plus an areas table.

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
    editor.js              card-based form editor for rooms, doors, windows
    viewport.js            pan and zoom of the plan
    render-plan.js         SVG drawing
    render-table.js        areas table, totals chips, warnings
    icons.js               small inline icons
tests/                     unit tests for lib/
```
