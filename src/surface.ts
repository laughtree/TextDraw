import { $, ctx2d } from './dom';
import { clearGlyphCaches } from './glyphs';
import { state } from './state';
import { css } from './theme';
import type { Metrics } from './types';

export const stage = $('stage');
export const view = $<HTMLCanvasElement>('view');
export const vctx = ctx2d(view);
/** drawing buffer: what the user has painted, in plain pixels */
export const buf = document.createElement('canvas');
export const bctx = ctx2d(buf, { willReadFrequently: true });
/** scratch layer for the faint "pen strokes" underlay */
export const tint = document.createElement('canvas');
export const tctx = ctx2d(tint);

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
  stage.style.setProperty('--cellh', state.ch + 'px');
  clearGlyphCaches();
}

/** Match the canvases to the stage size, keeping what was drawn, and recompute the cell grid. */
export function resize(): void {
  const r = stage.getBoundingClientRect();
  const nW = Math.max(1, Math.floor(r.width)),
    nH = Math.max(1, Math.floor(r.height));
  state.dpr = Math.min(window.devicePixelRatio || 1, 3);
  view.width = nW * state.dpr;
  view.height = nH * state.dpr;
  if (nW !== state.W || nH !== state.H) {
    const old = document.createElement('canvas');
    old.width = state.W || 1;
    old.height = state.H || 1;
    if (state.W && state.H) ctx2d(old).drawImage(buf, 0, 0);
    buf.width = nW;
    tint.width = nW;
    buf.height = nH;
    tint.height = nH;
    if (state.W && state.H) bctx.drawImage(old, 0, 0);
    state.W = nW;
    state.H = nH;
  }
  measure();
  state.cols = Math.floor(state.W / state.cw);
  state.rows = Math.floor(state.H / state.ch);
  $('meta').textContent = `${state.cols} × ${state.rows} cells`;
  state.dirty = true;
}
