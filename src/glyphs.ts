import { MIXCHARS } from './charsets';
import { ctx2d } from './dom';
import type { Metrics, Ramp } from './types';

// glyph calibration: measure how much of its cell each character actually inks.
// Results depend on the font and cell size, so callers must clearGlyphCaches() when either changes.
const glyphCache = new Map<string, number>();
const rampCache = new Map<string, Ramp>();
let mixCache: MixGlyph[] | null = null;

let scratch: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;
function getScratch() {
  if (!scratch) {
    const canvas = document.createElement('canvas');
    scratch = { canvas, ctx: ctx2d(canvas, { willReadFrequently: true }) };
  }
  return scratch;
}

export function clearGlyphCaches(): void {
  glyphCache.clear();
  rampCache.clear();
  mixCache = null;
}

/** Draw `c` on the scratch canvas at S× scale; non-ASCII glyphs are squeezed to the cell width. */
function drawGlyph(m: Metrics, c: string, w: number, h: number, S: number): void {
  const { canvas, ctx } = getScratch();
  canvas.width = w;
  canvas.height = h;
  ctx.font = `${m.fontPx * S}px ${m.font}`;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';
  if (c === ' ') return;
  if (c.charCodeAt(0) > 126) ctx.fillText(c, 0, h / 2 + S / 2, w);
  else ctx.fillText(c, 0, h / 2 + S / 2);
}

function glyphCov(c: string, wide: boolean, m: Metrics): number {
  if (c === ' ' || c === ' ') return 0;
  const key = wide ? c + '\u0001' : c;
  let v = glyphCache.get(key);
  if (v !== undefined) return v;
  const S = 4,
    w = Math.ceil(m.cw * S * (wide ? 2 : 1)),
    h = Math.ceil(m.ch * S);
  drawGlyph(m, c, w, h, S);
  const d = getScratch().ctx.getImageData(0, 0, w, h).data;
  let sum = 0;
  for (let i = 3; i < d.length; i += 4) sum += d[i];
  v = sum / 255 / (w * h);
  glyphCache.set(key, v);
  return v;
}

/** Sort a character set by measured ink and normalise to 0..1 so the darkest glyph = full tone. */
export function calibrated(chars: string[], wide: boolean, m: Metrics): Ramp {
  const key = chars.join('') + (wide ? '\u0001' : '');
  let r = rampCache.get(key);
  if (r) return r;
  const uniq = [...new Set([' ', ...chars])]
    .map((c) => [c, glyphCov(c, wide, m)] as const)
    .sort((p, q) => p[1] - q[1]);
  const max = uniq[uniq.length - 1][1] || 1;
  r = { c: uniq.map((u) => u[0]), v: uniq.map((u) => u[1] / max) };
  rampCache.set(key, r);
  return r;
}

export function pickGlyph(r: Ramp, t: number): string {
  let best = 0,
    bd = Infinity;
  for (let i = 0; i < r.v.length; i++) {
    const d = Math.abs(r.v[i] - t);
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return r.c[best];
}

/** 2×4 ink layout of a glyph: index = row * 2 + column. */
function glyphVec(c: string, m: Metrics): number[] {
  const S = 4,
    w = Math.ceil(m.cw * S),
    h = Math.ceil(m.ch * S);
  drawGlyph(m, c, w, h, S);
  const d = getScratch().ctx.getImageData(0, 0, w, h).data,
    v = new Array<number>(8).fill(0),
    cnt = new Array<number>(8).fill(0);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const q = Math.min(3, ((y * 4) / h) | 0) * 2 + (x * 2 < w ? 0 : 1);
      v[q] += d[(y * w + x) * 4 + 3] / 255;
      cnt[q]++;
    }
  return v.map((s, q) => s / (cnt[q] || 1));
}

export interface MixGlyph {
  c: string;
  /** per-zone ink, normalised so the densest glyph in the set reads as full tone */
  v: number[];
  /** mean of v */
  m: number;
}

export function mixSet(m: Metrics): MixGlyph[] {
  if (mixCache) return mixCache;
  const raw = MIXCHARS.map((c) => ({ c, v: glyphVec(c, m) }));
  const maxM = Math.max(...raw.map((g) => g.v.reduce((a, b) => a + b, 0) / 8)) || 1;
  mixCache = raw.map((g) => {
    const v = g.v.map((x) => x / maxM);
    return { c: g.c, v, m: v.reduce((a, b) => a + b, 0) / 8 };
  });
  return mixCache;
}
