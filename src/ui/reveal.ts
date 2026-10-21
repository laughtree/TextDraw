import { trackPanel } from '../panels';
import { resize, view } from '../surface';

/**
 * Enter/exit motion for things that appear on a click, built on the Web Animations API.
 * - collapse: height, padding, border, margin and opacity grow from nothing (pushes content aside)
 * - drop / rise: fade plus a small slide from above (toast) / below (help bubbles)
 * - fade: opacity only
 * While a collapse runs the drawing canvas is frozen at its old size, then re-fitted once at the end.
 */
export type RevealKind = 'collapse' | 'drop' | 'rise' | 'fade';

const SHOW_MS = 200;
const HIDE_MS = 150;
const EASE = 'cubic-bezier(0.2, 0, 0.38, 0.9)';
const SLIDE: Record<RevealKind, number> = { collapse: 0, drop: -8, rise: 4, fade: 0 };
const BOX = [
  'height',
  'marginTop',
  'paddingTop',
  'paddingBottom',
  'borderTopWidth',
  'borderBottomWidth',
] as const;
type Box = Record<(typeof BOX)[number], number>;

interface Entry {
  anim: Animation;
  collapse: boolean;
  done: boolean;
}
const entries = new Map<HTMLElement, Entry>();
let busy = 0;

/** True while a collapse animation is running, so the stage is changing size on purpose. */
export const layoutBusy = (): boolean => busy > 0;

const reducedMotion = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Whether the element is (or is on its way to being) shown; `hidden` lags while it animates out. */
export function isOpen(el: HTMLElement): boolean {
  return el.dataset.open ? el.dataset.open === 'true' : !el.hidden;
}

/** Keep the canvas at its current pixel size while the stage resizes under an animation. */
function freeze(): void {
  if (busy++ > 0) return;
  const r = view.getBoundingClientRect();
  view.style.width = `${r.width}px`;
  view.style.height = `${r.height}px`;
}

function unfreeze(): void {
  if (--busy > 0) return;
  view.style.width = '';
  view.style.height = '';
  resize(undefined, false); // a no-op unless the stage really changed size
}

function end(el: HTMLElement, entry: Entry): void {
  if (entry.done) return;
  entry.done = true;
  if (entries.get(el) === entry) entries.delete(el);
  el.style.overflow = '';
  entry.anim.cancel(); // drops the forwards fill of an exit
  if (entry.collapse) unfreeze();
}

function boxOf(el: HTMLElement): Box {
  const cs = getComputedStyle(el),
    px = (v: string) => parseFloat(v) || 0;
  return {
    height: el.getBoundingClientRect().height,
    marginTop: px(cs.marginTop),
    paddingTop: px(cs.paddingTop),
    paddingBottom: px(cs.paddingBottom),
    borderTopWidth: px(cs.borderTopWidth),
    borderBottomWidth: px(cs.borderBottomWidth),
  };
}

/** A collapsed box; the negative margin cancels the flex gap that would otherwise linger. */
function collapsedBox(el: HTMLElement): Box {
  const gap = parseFloat(getComputedStyle(el.parentElement ?? el).rowGap) || 0;
  return {
    height: 0,
    marginTop: -gap,
    paddingTop: 0,
    paddingBottom: 0,
    borderTopWidth: 0,
    borderBottomWidth: 0,
  };
}

const boxFrame = (b: Box, opacity: number): Keyframe => ({
  ...Object.fromEntries(BOX.map((k) => [k, `${b[k]}px`])),
  opacity,
});

/** Show or hide `el` with motion; does nothing if it is already (heading) there. */
export function reveal(el: HTMLElement, show: boolean, kind: RevealKind): void {
  if (isOpen(el) === show) return;
  el.dataset.open = String(show);
  const prev = entries.get(el);
  if (reducedMotion()) {
    if (prev) end(el, prev);
    el.hidden = !show;
    return;
  }

  const collapse = kind === 'collapse';
  if (collapse) trackPanel(el);
  // reversing mid-flight starts from where the element visually is
  const opacityNow = prev ? parseFloat(getComputedStyle(el).opacity) : null;
  const boxNow = prev && collapse ? boxOf(el) : null;
  if (collapse) freeze(); // before ending prev, so the count never dips to zero in between
  if (prev) end(el, prev);

  let frames: Keyframe[];
  if (collapse) {
    if (show) el.hidden = false;
    const natural = boxOf(el),
      shut = collapsedBox(el);
    el.style.overflow = 'hidden';
    frames = show
      ? [boxFrame(boxNow ?? shut, opacityNow ?? 0), boxFrame(natural, 1)]
      : [boxFrame(boxNow ?? natural, opacityNow ?? 1), boxFrame(shut, 0)];
  } else {
    if (show) el.hidden = false;
    const dy = SLIDE[kind];
    const at = (o: number): Keyframe =>
      dy ? { opacity: o, transform: `translateY(${dy * (1 - o)}px)` } : { opacity: o };
    frames = show ? [at(opacityNow ?? 0), at(1)] : [at(opacityNow ?? 1), at(0)];
  }

  const anim = el.animate(frames, {
    duration: show ? SHOW_MS : HIDE_MS,
    easing: EASE,
    fill: show ? 'none' : 'forwards',
  });
  const entry: Entry = { anim, collapse, done: false };
  entries.set(el, entry);
  anim.onfinish = () => {
    if (!show) el.hidden = true;
    end(el, entry);
  };
}
