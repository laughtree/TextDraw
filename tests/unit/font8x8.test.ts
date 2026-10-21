import { describe, expect, it } from 'vitest';
import { IBM8, SAMPLE_LINES } from '../../src/font8x8';

describe('font8x8', () => {
  it('has a full 8-row glyph for every letter of the starter words', () => {
    for (const ch of SAMPLE_LINES.join('')) {
      const rows = IBM8[ch];
      expect(rows, ch).toBeDefined();
      expect(rows).toHaveLength(8);
      for (const r of rows) {
        expect(Number.isInteger(r) && r >= 0 && r <= 255, `${ch} row ${r}`).toBe(true);
      }
      expect(
        rows.some((r) => r !== 0),
        `${ch} is not blank`,
      ).toBe(true);
    }
  });

  it('starts with DRAW and TEXT', () => {
    expect(SAMPLE_LINES).toEqual(['DRAW', 'TEXT']);
  });

  it('keeps the new letters in the same style as the old ones: top row wide, last row empty', () => {
    expect(IBM8.D[0]).toBe(0x3f);
    expect(IBM8.W[4]).toBe(0x7f);
    expect(IBM8.X[3]).toBe(0x1c);
    for (const ch of 'DWX') expect(IBM8[ch][7]).toBe(0);
  });

  it('draws X and W symmetrically (glyphs are 7 bits wide, bit 7 unused)', () => {
    const mirror7 = (b: number) =>
      parseInt(b.toString(2).padStart(7, '0').split('').reverse().join(''), 2);
    for (const ch of 'XW') {
      for (const r of IBM8[ch]) expect(mirror7(r), `${ch} ${r.toString(16)}`).toBe(r);
    }
  });
});
