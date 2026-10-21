import { blockPaint } from './blocks';
import { DOTS } from './charsets';
import type { Mode } from './types';

export interface PaintGeometry {
  cw: number;
  ch: number;
  cols: number;
  rows: number;
}

/**
 * Draw a converted grid the way the screen shows it: braille as round dots, blocks as rectangles,
 * halftone dots as circles, everything else as text. Shared by the live view and the PNG export,
 * so the picture you export is the picture you see. `colors[k]` null means the theme `ink`.
 */
export function paintGrid(
  ctx: CanvasRenderingContext2D,
  grid: string[],
  colors: (string | null)[],
  { cw, ch, cols, rows }: PaintGeometry,
  mode: Mode,
  ink: string,
  font: string,
): void {
  const colorAt = (k: number) => colors[k] || ink;
  ctx.font = font;
  ctx.textBaseline = 'middle';
  if (mode === 'braille') {
    // draw dots ourselves so they look even regardless of font coverage
    const r = Math.max(1, cw * 0.16),
      BIT = [
        [1, 0, 0],
        [2, 0, 1],
        [4, 0, 2],
        [64, 0, 3],
        [8, 1, 0],
        [16, 1, 1],
        [32, 1, 2],
        [128, 1, 3],
      ];
    for (let k = 0; k < grid.length; k++) {
      const c = grid[k];
      if (c === ' ') continue;
      const b = c.charCodeAt(0) - 0x2800,
        x0 = (k % cols) * cw,
        y0 = ((k / cols) | 0) * ch;
      ctx.fillStyle = colorAt(k);
      ctx.beginPath();
      for (const [bit, sc, sr] of BIT)
        if (b & bit) {
          const x = x0 + cw * (0.28 + sc * 0.44),
            y = y0 + ch * (0.14 + sr * 0.24);
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, Math.PI * 2);
        }
      ctx.fill();
    }
    return;
  }
  if (mode === 'block') {
    for (let k = 0; k < grid.length; k++) {
      const paint = blockPaint(grid[k]);
      if (!paint) continue;
      const x0 = (k % cols) * cw,
        y0 = ((k / cols) | 0) * ch;
      ctx.fillStyle = colorAt(k);
      ctx.globalAlpha = paint.alpha;
      for (const [fx0, fy0, fx1, fy1] of paint.rects)
        ctx.fillRect(x0 + fx0 * cw, y0 + fy0 * ch, (fx1 - fx0) * cw + 0.5, (fy1 - fy0) * ch + 0.5);
      ctx.globalAlpha = 1;
    }
    return;
  }
  if (mode === 'dots') {
    for (let k = 0; k < grid.length; k++) {
      const d = DOTS.find((e) => e[0] === grid[k]);
      if (!d || !d[1]) continue;
      ctx.fillStyle = colorAt(k);
      ctx.beginPath();
      ctx.arc((k % cols) * cw + cw / 2, ((k / cols) | 0) * ch + ch / 2, d[1] * cw, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  for (let j = 0; j < rows; j++) {
    const y = j * ch + ch / 2 + 0.5;
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i,
        c = grid[k];
      if (c === ' ' || c === '') continue;
      ctx.fillStyle = colorAt(k);
      if (mode === 'cjk') ctx.fillText(c, i * cw, y, cw * 2);
      else if (c.charCodeAt(0) > 126) ctx.fillText(c, i * cw, y, cw);
      else ctx.fillText(c, i * cw, y);
    }
  }
}
