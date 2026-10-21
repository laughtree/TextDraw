// Block-element glyphs (shades, quadrants, eighths) described as filled rectangles, so the same
// definition drives both painting a cell and computing its 2×4 ink layout.

/** A filled area as fractions of the cell: [left, top, right, bottom]. */
export type Rect = readonly [number, number, number, number];

export interface BlockPaint {
  alpha: number;
  rects: readonly Rect[];
}

/** A character and how much ink it puts in each of the cell's 2×4 zones (index = row * 2 + column). */
export interface Candidate {
  c: string;
  v: number[];
  /** mean of v */
  m: number;
}

export const SHADES = [
  ['░', 0.25],
  ['▒', 0.5],
  ['▓', 0.75],
] as const;

// quadrant blocks indexed by bitmask: 1 = top-left, 2 = top-right, 4 = bottom-left, 8 = bottom-right
export const QUAD = [
  ' ',
  '▘',
  '▝',
  '▀',
  '▖',
  '▌',
  '▞',
  '▛',
  '▗',
  '▚',
  '▐',
  '▜',
  '▄',
  '▙',
  '▟',
  '█',
];
const QUAD_CELLS: readonly Rect[] = [
  [0, 0, 0.5, 0.5],
  [0.5, 0, 1, 0.5],
  [0, 0.5, 0.5, 1],
  [0.5, 0.5, 1, 1],
];

const FULL: Rect = [0, 0, 1, 1];

/** Bars that grow from the bottom (▁–▇) or the left (▏–▉); ▄ and ▌ are already quadrant pairs. */
export const EIGHTHS: Readonly<Record<string, Rect>> = {
  '▁': [0, 7 / 8, 1, 1],
  '▂': [0, 3 / 4, 1, 1],
  '▃': [0, 5 / 8, 1, 1],
  '▅': [0, 3 / 8, 1, 1],
  '▆': [0, 1 / 4, 1, 1],
  '▇': [0, 1 / 8, 1, 1],
  '▏': [0, 0, 1 / 8, 1],
  '▎': [0, 0, 1 / 4, 1],
  '▍': [0, 0, 3 / 8, 1],
  '▋': [0, 0, 5 / 8, 1],
  '▊': [0, 0, 3 / 4, 1],
  '▉': [0, 0, 7 / 8, 1],
};

/** Every non-blank block character, in tie-break order: shades, quadrant shapes, eighths. */
export const BLOCK_CHARS: string[] = [
  ...SHADES.map((s) => s[0]),
  ...QUAD.slice(1),
  ...Object.keys(EIGHTHS),
];

/** How to paint a block character, or null if it is not one. */
export function blockPaint(c: string): BlockPaint | null {
  if (c === '█') return { alpha: 1, rects: [FULL] };
  const shade = SHADES.find((s) => s[0] === c);
  if (shade) return { alpha: shade[1], rects: [FULL] };
  const eighth = EIGHTHS[c];
  if (eighth) return { alpha: 1, rects: [eighth] };
  const bits = QUAD.indexOf(c);
  if (bits > 0) return { alpha: 1, rects: QUAD_CELLS.filter((_, i) => (bits >> i) & 1) };
  return null;
}

/** Fraction of each 2×4 zone covered (times alpha) when the paint is drawn in a cell. */
export function zoneVector(paint: BlockPaint): number[] {
  const v = new Array<number>(8).fill(0);
  for (let q = 0; q < 8; q++) {
    const col = q & 1,
      row = q >> 1;
    const zx0 = col / 2,
      zx1 = (col + 1) / 2,
      zy0 = row / 4,
      zy1 = (row + 1) / 4;
    let area = 0;
    for (const [x0, y0, x1, y1] of paint.rects) {
      area +=
        Math.max(0, Math.min(x1, zx1) - Math.max(x0, zx0)) *
        Math.max(0, Math.min(y1, zy1) - Math.max(y0, zy0));
    }
    v[q] = (area / (0.5 * 0.25)) * paint.alpha;
  }
  return v;
}

const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;

/** Blank plus every block character, with ideal (geometric) ink layouts. */
export const BLOCK_SET: Candidate[] = [' ', ...BLOCK_CHARS].map((c) => {
  const paint = blockPaint(c);
  const v = paint ? zoneVector(paint) : new Array<number>(8).fill(0);
  return { c, v, m: mean(v) };
});
