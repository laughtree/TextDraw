import { bounds } from './export';
import { paintGrid } from './paint';
import { state } from './state';
import { monoFont } from './surface';
import { css } from './theme';

/** Pixels per cell pixel in the exported picture (so it stays sharp when posted). */
export const PNG_SCALE = 2;
/** Larger pictures are scaled down to keep the longest side within this. */
const MAX_SIDE = 4096;
/** Empty cells left around the drawing. */
const MARGIN_CELLS = 1;

/**
 * Draw the converted picture to a PNG: cropped to the cells that hold a character (plus a one-cell
 * margin), transparent background, theme ink for the ink-coloured parts and the drawn colours for
 * the rest. Resolves to null when nothing is drawn.
 */
export function renderPng(): Promise<Blob | null> {
  const { grid, gridCol, cols, rows, cw, ch, mode } = state;
  const box = bounds({ grid, colors: gridCol, cols, rows });
  if (!box) return Promise.resolve(null);
  const wCells = box.r - box.l + 1 + 2 * MARGIN_CELLS,
    hCells = box.b - box.t + 1 + 2 * MARGIN_CELLS;
  const scale = Math.min(PNG_SCALE, MAX_SIDE / Math.max(wCells * cw, hCells * ch));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(wCells * cw * scale));
  canvas.height = Math.max(1, Math.round(hCells * ch * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  ctx.scale(scale, scale);
  ctx.translate((MARGIN_CELLS - box.l) * cw, (MARGIN_CELLS - box.t) * ch);
  paintGrid(ctx, grid, gridCol, { cw, ch, cols, rows }, mode, css('--ink'), monoFont());
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
