import { FONT, GLYPH_H, GLYPH_W, PITCH, SAMPLE_LINES } from './font';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SampleLayout {
  /** one filled rectangle per font pixel, in drawing-buffer pixels */
  rects: Rect[];
  /** ink bounding box of each line */
  lines: { x0: number; y0: number; x1: number; y1: number }[];
}

/** Font pixels between two lines. */
const LINE_GAP = 2;

/**
 * Lay the starter words out on a cols × rows grid of cw × ch cells.
 * One font pixel = k × (half a cell wide, half a cell tall), so every pixel sits on the cell's
 * quadrant grid and converts cleanly; k is the largest (up to 3) that fits. The ink, not the
 * letter pitch, is centred, so margins are equal and every line has the same left and right edge.
 */
export function sampleLayout(cw: number, ch: number, cols: number, rows: number): SampleLayout {
  const lines = SAMPLE_LINES;
  const inkW = (Math.max(...lines.map((l) => l.length)) - 1) * PITCH + GLYPH_W;
  const inkH = lines.length * GLYPH_H + (lines.length - 1) * LINE_GAP;
  const fits = (k: number) => (inkW * k) / 2 <= cols && (inkH * k) / 2 <= rows;
  let k = 1;
  for (let t = 3; t >= 2; t--) {
    if (fits(t)) {
      k = t;
      break;
    }
  }
  const pw = (cw / 2) * k,
    ph = (ch / 2) * k;
  // snap the start to half a cell, the grid the converter works on
  const snap = (v: number, unit: number) => Math.round(v / unit) * unit;
  const x0 = Math.max(0, snap((cols * cw - inkW * pw) / 2, cw / 2)),
    y0 = Math.max(0, snap((rows * ch - inkH * ph) / 2, ch / 2));
  // edges are snapped the same way the converter assigns pixels to cells (floor(x / cw)), so nothing leaks
  const edge = (v: number) => Math.ceil(v - 1e-6);

  const rects: Rect[] = [];
  const bounds: SampleLayout['lines'] = [];
  lines.forEach((line, li) => {
    const top = y0 + li * (GLYPH_H + LINE_GAP) * ph;
    const inkWidth = ((line.length - 1) * PITCH + GLYPH_W) * pw;
    // lines shorter than the widest are centred on it
    const left = x0 + (inkW * pw - inkWidth) / 2;
    [...line].forEach((chr, ci) =>
      FONT[chr].forEach((bits, r) => {
        for (let bit = 0; bit < GLYPH_W; bit++) {
          if (!((bits >> bit) & 1)) continue;
          const xa = edge(left + (ci * PITCH + bit) * pw),
            xb = edge(left + (ci * PITCH + bit + 1) * pw),
            ya = edge(top + r * ph),
            yb = edge(top + (r + 1) * ph);
          rects.push({ x: xa, y: ya, w: xb - xa, h: yb - ya });
        }
      }),
    );
    bounds.push({
      x0: edge(left),
      y0: edge(top),
      x1: edge(left + inkWidth),
      y1: edge(top + GLYPH_H * ph),
    });
  });
  return { rects, lines: bounds };
}
