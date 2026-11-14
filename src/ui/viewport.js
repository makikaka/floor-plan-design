/**
 * Pan and zoom for the plan <svg> by changing its viewBox.
 * - drag to pan, wheel to zoom (around the cursor), double-click to fit
 * - the zoom is kept while you edit; it only refits if you have not moved the view
 */
export function createViewport(svg) {
  let base = null;      // full plan bounds {x, y, w, h}
  let view = null;      // current viewBox
  let fitted = true;    // true until the user pans or zooms
  let dragged = false;  // true after a drag, so a click can be ignored

  const MAX_ZOOM = 12;
  const MIN_ZOOM = 0.4;

  const apply = () => svg.setAttribute("viewBox", `${view.x} ${view.y} ${view.w} ${view.h}`);

  function setBounds({ minX, minY, maxX, maxY }) {
    base = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    if (fitted || !view) {
      view = { ...base };
      fitted = true;
      apply();
    }
  }

  function fit() {
    if (!base) return;
    view = { ...base };
    fitted = true;
    apply();
  }

  function toSvgPoint(clientX, clientY) {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  function zoomAt(factor, point) {
    if (!base) return;
    const p = point ?? { x: view.x + view.w / 2, y: view.y + view.h / 2 };
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, (base.w / view.w) * factor));
    const w = base.w / zoom;
    const real = view.w / w;
    view = {
      x: p.x - (p.x - view.x) / real,
      y: p.y - (p.y - view.y) / real,
      w,
      h: view.h / real,
    };
    fitted = false;
    apply();
  }

  // ----- wheel zoom -----
  svg.addEventListener("wheel", (e) => {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
    zoomAt(factor, toSvgPoint(e.clientX, e.clientY));
  }, { passive: false });

  // ----- drag to pan -----
  let start = null;
  svg.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    dragged = false;
    start = { x: e.clientX, y: e.clientY, last: { x: e.clientX, y: e.clientY }, id: e.pointerId, active: false };
  });
  svg.addEventListener("pointermove", (e) => {
    if (!start || e.pointerId !== start.id) return;
    if (!start.active) {
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < 5) return;
      start.active = true;
      dragged = true;
      svg.setPointerCapture(e.pointerId);
      svg.classList.add("is-panning");
    }
    const scale = svg.getScreenCTM().a;
    view.x -= (e.clientX - start.last.x) / scale;
    view.y -= (e.clientY - start.last.y) / scale;
    start.last = { x: e.clientX, y: e.clientY };
    fitted = false;
    apply();
  });
  const endDrag = (e) => {
    if (start && e.pointerId === start.id) {
      start = null;
      svg.classList.remove("is-panning");
    }
  };
  svg.addEventListener("pointerup", endDrag);
  svg.addEventListener("pointercancel", endDrag);

  svg.addEventListener("dblclick", fit);

  return {
    setBounds,
    fit,
    zoomIn: () => zoomAt(1.3),
    zoomOut: () => zoomAt(1 / 1.3),
    /** True if the last pointer gesture was a drag (so the click should be ignored). */
    wasDragged: () => dragged,
  };
}
