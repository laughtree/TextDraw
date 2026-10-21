import { describe, expect, it } from 'vitest';
import { FONT, GLYPH_H, GLYPH_W, SAMPLE_LINES } from '../../src/font';

const LAST = GLYPH_W - 1;
const column = (rows: number[], c: number) => rows.some((r) => (r >> c) & 1);
const mirror = (b: number) =>
  parseInt(b.toString(2).padStart(GLYPH_W, '0').split('').reverse().join(''), 2);

describe('block font', () => {
  it('has a glyph for every letter of the starter words, 7 rows of 7 columns', () => {
    for (const ch of SAMPLE_LINES.join('')) {
      const rows = FONT[ch];
      expect(rows, ch).toBeDefined();
      expect(rows).toHaveLength(GLYPH_H);
      for (const r of rows) expect(r >> GLYPH_W, `${ch} stays inside 7 columns`).toBe(0);
    }
  });

  it('makes every letter exactly as wide: ink in the first and in the last column', () => {
    for (const [ch, rows] of Object.entries(FONT)) {
      expect(column(rows, 0), `${ch} first column`).toBe(true);
      expect(column(rows, LAST), `${ch} last column`).toBe(true);
    }
  });

  it('uses every row (no blank top or bottom row)', () => {
    for (const [ch, rows] of Object.entries(FONT)) {
      expect(rows[0], `${ch} top`).not.toBe(0);
      expect(rows[GLYPH_H - 1], `${ch} bottom`).not.toBe(0);
    }
  });

  it('draws X, W and T symmetrically', () => {
    for (const ch of 'XWT') {
      for (const r of FONT[ch]) expect(mirror(r), `${ch} ${r.toString(2)}`).toBe(r);
    }
  });

  it('starts with DRAW and TEXT', () => {
    expect(SAMPLE_LINES).toEqual(['DRAW', 'TEXT']);
  });
});
