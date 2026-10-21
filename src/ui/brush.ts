import { ringDiameter } from '../brush';
import { $ } from '../dom';
import { state } from '../state';
import { paper, view } from '../surface';

const SLIDER_HOLD_MS = 800;
const FADE_MS = 220;

/**
 * Shows the brush footprint as a DOM ring over the canvas (never painted into it, so it costs no
 * re-conversion): follows the pointer while hovering or drawing, and previews the width
 * at the stage centre while the size slider moves.
 */
export function initBrush(): void {
  const ring = $('brush'),
    slider = $<HTMLInputElement>('size');
  let timer: ReturnType<typeof setTimeout> | undefined;

  const hide = () => {
    clearTimeout(timer);
    ring.classList.remove('fading');
    ring.hidden = true;
  };
  const place = (x: number, y: number, size: number) => {
    if (state.tool === 'text' || state.tool === 'pick') return hide(); // other cursors stand in
    clearTimeout(timer);
    ring.classList.remove('fading');
    const d = ringDiameter(state.tool, state.erase, size, state.scale);
    ring.style.setProperty('--d', d + 'px');
    ring.style.transform = `translate(${x - d / 2}px, ${y - d / 2}px)`;
    ring.classList.toggle('erase', state.erase);
    ring.hidden = false;
  };
  const follow = (e: PointerEvent) => {
    const r = view.getBoundingClientRect();
    place(e.clientX - r.left, e.clientY - r.top, state.size);
  };

  view.addEventListener('pointermove', follow);
  view.addEventListener('pointerdown', follow);
  view.addEventListener('pointerleave', () => {
    if (!state.drawing) hide();
  });
  view.addEventListener('pointerup', (e) => {
    const r = view.getBoundingClientRect();
    const inside =
      e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    // a finger leaves nothing to hover; a mouse/pen that ended outside the canvas has no ring either
    if (e.pointerType === 'touch' || !inside) hide();
  });
  view.addEventListener('pointercancel', hide);

  slider.addEventListener('input', () => {
    place(paper.clientWidth / 2, paper.clientHeight / 2, +slider.value);
    timer = setTimeout(() => {
      ring.classList.add('fading');
      timer = setTimeout(hide, FADE_MS);
    }, SLIDER_HOLD_MS);
  });
}
