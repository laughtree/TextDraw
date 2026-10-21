import { $, ctx2d } from './dom';
import { bufferSize, fitScale, type Grid } from './grid';
import { clearGlyphCaches } from './glyphs';
import { state } from './state';
import { css } from './theme';
import type { Metrics } from './types';

export const stage = $('stage');
export const paper = $('paper');
export const view = $<HTMLCanvasElement>('view');
export const vctx = ctx2d(view);
/** drawing buffer: what the user has painted, in plain pixels */
export const buf = document.createElement('canvas');
export const bctx = ctx2d(buf, { willReadFrequently: true });
/** scratch layer for the faint "pen strokes" underlay */
export const tint = document.createElement('canvas');
export const tctx = ctx2d(tint);

/** space kept free around a fixed-size canvas inside the stage, in CSS px */
const STAGE_PAD = 8;

/** What happens to the painting when the buffer size changes: crop/pad at the top-left, or stretch. */
export type ContentMode = 'keep' | 'scale';

export function monoFont(): string {
  return `${state.fontPx}px ${css('--f-mono')}`;
}

/** Current canvas geometry in the shape the converter expects. */
export function metrics(): Metrics {
  const { W, H, cw, ch, cols, rows, fontPx } = state;
  return { W, H, cw, ch, cols, rows, fontPx, font: css('--f-mono') };
}

function measure(): void {
  vctx.font = monoFont();
  state.cw = vctx.measureText('M').width;
  state.ch = Math.round(state.cw * 2.05);
  clearGlyphCaches();
}

function applyBuffer(nW: number, nH: number, content: ContentMode): void {
  if (nW === state.W && nH === state.H) return;
  const { W: oldW, H: oldH } = state;
  const old = document.createElement('canvas');
  old.width = oldW || 1;
  old.height = oldH || 1;
  if (oldW && oldH) ctx2d(old).drawImage(buf, 0, 0);
  buf.width = nW;
  tint.width = nW;
  buf.height = nH;
  tint.height = nH;
  if (oldW && oldH) {
    if (content === 'scale') {
      bctx.imageSmoothingEnabled = true;
      bctx.imageSmoothingQuality = 'high';
      bctx.drawImage(old, 0, 0, oldW, oldH, 0, 0, nW, nH);
    } else bctx.drawImage(old, 0, 0);
  }
  state.W = nW;
  state.H = nH;
}

/**
 * Size the canvases and recompute the cell grid.
 * Auto mode follows the stage and keeps the painting where it was; a fixed grid keeps its cell count,
 * is fitted into the stage, and stretches the painting when its buffer size changes.
 */
export function resize(content?: ContentMode): void {
  const fixed = state.fixed;
  state.dpr = Math.min(window.devicePixelRatio || 1, 3);
  measure();
  stage.classList.toggle('fixed', !!fixed);
  let nW: number, nH: number;
  if (fixed) {
    ({ W: nW, H: nH } = bufferSize(fixed, state.cw, state.ch));
    const s = fitScale(
      nW,
      nH,
      Math.max(1, stage.clientWidth - 2 * STAGE_PAD),
      Math.max(1, stage.clientHeight - 2 * STAGE_PAD),
    );
    view.width = Math.max(1, Math.round(nW * state.dpr * s));
    state.renderScale = view.width / nW;
    view.height = Math.max(1, Math.round(nH * state.renderScale));
    state.scale = state.renderScale / state.dpr;
    paper.style.width = view.width / state.dpr + 'px';
    paper.style.height = view.height / state.dpr + 'px';
  } else {
    const r = stage.getBoundingClientRect();
    nW = Math.max(1, Math.floor(r.width));
    nH = Math.max(1, Math.floor(r.height));
    state.scale = 1;
    state.renderScale = state.dpr;
    view.width = nW * state.dpr;
    view.height = nH * state.dpr;
    paper.style.width = '';
    paper.style.height = '';
  }
  applyBuffer(nW, nH, content ?? (fixed ? 'scale' : 'keep'));
  state.cols = fixed ? fixed.cols : Math.floor(state.W / state.cw);
  state.rows = fixed ? fixed.rows : Math.floor(state.H / state.ch);
  paper.style.setProperty('--cellh', state.ch * state.scale + 'px');
  $('meta').textContent = `${state.cols} × ${state.rows} cells`;
  state.dirty = true;
  document.dispatchEvent(new Event('gridchange'));
}

/** Switch between auto (null) and a fixed grid. */
export function setGrid(fixed: Grid | null, content?: ContentMode): void {
  state.fixed = fixed && { ...fixed };
  resize(content);
}
