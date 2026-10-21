export interface Grid {
  cols: number;
  rows: number;
}

export const LIMITS = { minCols: 8, maxCols: 200, minRows: 4, maxRows: 100 };

/** Round to whole cells and keep within LIMITS. */
export function clampGrid(cols: number, rows: number): Grid {
  const fit = (v: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(v)));
  return {
    cols: fit(cols, LIMITS.minCols, LIMITS.maxCols),
    rows: fit(rows, LIMITS.minRows, LIMITS.maxRows),
  };
}

/** Number typed into a field; empty or non-numeric text yields `fallback`. */
export function parseDim(text: string, fallback: number): number {
  const t = text.trim();
  const n = Number(t);
  return t !== '' && Number.isFinite(n) ? n : fallback;
}

/** Drawing-buffer size in pixels for a fixed grid. */
export function bufferSize(g: Grid, cw: number, ch: number): { W: number; H: number } {
  return { W: Math.max(1, Math.ceil(g.cols * cw)), H: Math.max(1, g.rows * ch) };
}

/** Largest scale at which a W×H canvas fits inside availW×availH. */
export function fitScale(W: number, H: number, availW: number, availH: number): number {
  return Math.max(1e-3, Math.min(availW / W, availH / H));
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The largest rectangle with the source's proportions that fits the target, centred in it. */
export function containRect(srcW: number, srcH: number, dstW: number, dstH: number): Box {
  const s = Math.min(dstW / srcW, dstH / srcH),
    w = srcW * s,
    h = srcH * s;
  return { x: (dstW - w) / 2, y: (dstH - h) / 2, w, h };
}
