import { commitUndo, pushUndo, restoreBase, takeSnapshot, type Entry } from './history';
import { drawShape, type Point, type ShapeKind } from './shapes';
import { state } from './state';
import { bctx, view } from './surface';
import { beginText } from './text';
import type { Tool } from './types';

function pos(e: PointerEvent): Point {
  const r = view.getBoundingClientRect();
  // CSS px → buffer px (state.scale is 1 unless a fixed grid is fitted to the stage)
  return { x: (e.clientX - r.left) / state.scale, y: (e.clientY - r.top) / state.scale };
}

function stroke(a: Point, b: Point): void {
  bctx.save();
  bctx.globalCompositeOperation = state.erase ? 'destination-out' : 'source-over';
  bctx.strokeStyle = state.penColor;
  bctx.fillStyle = state.penColor;
  bctx.lineWidth = state.size;
  bctx.lineCap = 'round';
  bctx.lineJoin = 'round';
  bctx.beginPath();
  bctx.moveTo(a.x, a.y);
  bctx.lineTo(b.x + 0.01, b.y);
  bctx.stroke();
  bctx.restore();
  state.dirty = true;
}

const isShape = (t: Tool): t is ShapeKind => t === 'line' || t === 'circle' || t === 'rect';

/** A shape being dragged out: the untouched canvas it is previewed over, and where it started. */
interface Drag {
  base: Entry | null;
  start: Point;
  kind: ShapeKind;
}
let drag: Drag | null = null;
let textDown = false;

/** Redraw the shape from its start to `to` over the clean canvas, so it previews live. */
function paintDrag(to: Point): void {
  if (!drag) return;
  if (drag.base) restoreBase(drag.base);
  drawShape(bctx, drag.kind, drag.start, to, {
    color: state.penColor,
    width: state.size,
    erase: state.erase,
  });
  state.dirty = true;
}

/** Drop the shape being dragged and show the canvas as it was. */
function abortDrag(): void {
  if (drag?.base) restoreBase(drag.base);
  drag = null;
  state.drawing = false;
}

export function initDraw(): void {
  view.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (state.tool === 'pick') return; // the eyedropper only reads
    if (state.tool === 'text') {
      textDown = true; // the editor opens on release, so the click cannot steal its focus
      return;
    }
    view.setPointerCapture(e.pointerId);
    state.drawing = true;
    if (isShape(state.tool)) {
      drag = { base: takeSnapshot(), start: pos(e), kind: state.tool };
      return;
    }
    pushUndo();
    state.last = pos(e);
    stroke(state.last, state.last);
  });

  view.addEventListener('pointermove', (e) => {
    if (drag) {
      paintDrag(pos(e));
      return;
    }
    if (!state.drawing || !state.last) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of evs) {
      const p = pos(ev);
      stroke(state.last, p);
      state.last = p;
    }
  });

  view.addEventListener('pointerup', (e) => {
    if (textDown) {
      textDown = false;
      if (state.tool === 'text') beginText(pos(e));
      return;
    }
    if (drag) {
      const to = pos(e);
      if (Math.hypot(to.x - drag.start.x, to.y - drag.start.y) >= 1) {
        paintDrag(to);
        commitUndo(drag.base);
      } else if (drag.base) {
        restoreBase(drag.base); // a plain click draws nothing and leaves no undo step
      }
      drag = null;
    }
    state.drawing = false;
    state.last = null;
  });

  view.addEventListener('pointercancel', () => {
    textDown = false;
    abortDrag();
    state.last = null;
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drag) abortDrag();
  });
}
