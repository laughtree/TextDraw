/**
 * Single-choice button groups (`.seg`) and the colour row show their selection with a layer that
 * slides from the old choice to the new one. The code that makes a choice only sets
 * `aria-pressed` (or the palette's `on` class); the groups watch for that, measure the chosen
 * button and move the layer there with a CSS transition. Without this module the buttons keep
 * their own selected style, which is the fallback.
 */
import { snapSpan } from '../snap';

/**
 * Where `el` sits inside `box`, ignoring the box's border, with its edges snapped to whole device
 * pixels the way layout snaps them (see snapSpan), so a layer drawn there meets the button exactly.
 */
function relativeRect(el: Element, box: HTMLElement) {
  const r = el.getBoundingClientRect(),
    b = box.getBoundingClientRect(),
    dpr = window.devicePixelRatio || 1;
  const h = snapSpan(r.left, r.right, b.left + box.clientLeft, dpr),
    v = snapSpan(r.top, r.bottom, b.top + box.clientTop, dpr);
  return { x: h.pos, y: v.pos, w: h.size, h: v.size };
}

const shown = (el: HTMLElement): boolean => el.getClientRects().length > 0;

/** Run `apply` without any transition, so the layer jumps to its place instead of sliding there. */
function instantly(el: HTMLElement, apply: () => void): void {
  el.classList.add('still');
  apply();
  void el.offsetWidth; // let the new values count as the starting point
  el.classList.remove('still');
}

function bindGroup(group: HTMLElement): void {
  group.classList.add('slides');
  const place = (animate: boolean) => {
    if (!shown(group)) return; // measured when it first appears (the resize observer fires then)
    const apply = () => {
      const chosen = group.querySelector<HTMLElement>('button[aria-pressed="true"]');
      if (!chosen) {
        group.style.setProperty('--o', '0'); // nothing chosen here (the eyedropper is in use)
        return;
      }
      const { x, w } = relativeRect(chosen, group);
      group.style.setProperty('--x', `${x}px`);
      group.style.setProperty('--w', `${w}px`);
      group.style.setProperty('--o', '1');
    };
    if (animate) apply();
    else instantly(group, apply);
  };
  place(false);
  new MutationObserver(() => place(true)).observe(group, {
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-pressed'],
  });
  new ResizeObserver(() => place(false)).observe(group);
  // zooming the page or moving to another screen changes the device pixel ratio, not the layout size
  window.addEventListener('resize', () => place(false));
}

/** The colour choice: a frame that slides over the swatches and into the palette button. */
function bindColorRing(row: HTMLElement): void {
  const swatches = row.querySelector<HTMLElement>('.swatches');
  const place = (animate: boolean) => {
    if (!shown(row)) return;
    const apply = () => {
      const chosen = row.querySelector<HTMLElement>(
        '.swatches .sw[aria-pressed="true"], .sw.pick.on',
      );
      if (!chosen) {
        row.style.setProperty('--ro', '0');
        return;
      }
      // a swatch scrolled out of its strip must not leave the frame floating over other controls
      if (swatches && swatches.contains(chosen)) {
        const c = chosen.getBoundingClientRect(),
          s = swatches.getBoundingClientRect();
        if (c.left < s.left - 1 || c.right > s.right + 1) {
          row.style.setProperty('--ro', '0');
          return;
        }
      }
      const { x, y, w, h } = relativeRect(chosen, row);
      row.style.setProperty('--rx', `${x}px`);
      row.style.setProperty('--ry', `${y}px`);
      row.style.setProperty('--rw', `${w}px`);
      row.style.setProperty('--rh', `${h}px`);
      row.style.setProperty('--ro', '1');
    };
    if (animate) apply();
    else instantly(row, apply);
  };
  place(false);
  new MutationObserver(() => place(true)).observe(row, {
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-pressed', 'class'],
  });
  new ResizeObserver(() => place(false)).observe(row);
  swatches?.addEventListener('scroll', () => place(false));
  window.addEventListener('resize', () => place(false));
}

export function initSegments(): void {
  document.querySelectorAll<HTMLElement>('.seg').forEach(bindGroup);
  const row = document.querySelector<HTMLElement>('.colorrow');
  if (row) bindColorRing(row);
}
