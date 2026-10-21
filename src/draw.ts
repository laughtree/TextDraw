import { strokeWidth } from './brush';
import { pushUndo } from './history';
import { state } from './state';
import { bctx, view } from './surface';

interface Point {
  x: number;
  y: number;
}

function pos(e: PointerEvent): Point {
  const r = view.getBoundingClientRect();
  // CSS px → buffer px (state.scale is 1 unless a fixed grid is fitted to the stage)
  return { x: (e.clientX - r.left) / state.scale, y: (e.clientY - r.top) / state.scale };
}

function stroke(a: Point, b: Point): void {
  bctx.save();
  bctx.globalCompositeOperation = state.tool === 'erase' ? 'destination-out' : 'source-over';
  bctx.strokeStyle = state.penColor;
  bctx.fillStyle = state.penColor;
  bctx.lineWidth = strokeWidth(state.tool, state.size);
  bctx.lineCap = 'round';
  bctx.lineJoin = 'round';
  bctx.beginPath();
  bctx.moveTo(a.x, a.y);
  bctx.lineTo(b.x + 0.01, b.y);
  bctx.stroke();
  bctx.restore();
  state.dirty = true;
}

export function initDraw(): void {
  view.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    view.setPointerCapture(e.pointerId);
    pushUndo();
    state.drawing = true;
    state.last = pos(e);
    stroke(state.last, state.last);
  });
  view.addEventListener('pointermove', (e) => {
    if (!state.drawing || !state.last) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of evs) {
      const p = pos(ev);
      stroke(state.last, p);
      state.last = p;
    }
  });
  const end = () => {
    state.drawing = false;
    state.last = null;
  };
  view.addEventListener('pointerup', end);
  view.addEventListener('pointercancel', end);
}
