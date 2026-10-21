import { describe, expect, it } from 'vitest';
import { sampleLayout } from '../../src/sampleLayout';

// [cw, ch, cols, rows]: the usual window, a small fixed grid, and a tall narrow one
const CASES: [string, number, number, number, number][] = [
  ['window 51 × 26', 7.8, 16, 51, 26],
  ['small 24 × 12', 7.8, 16, 24, 12],
  ['preset 32 × 16', 7.8, 16, 32, 16],
  ['wide 120 × 40', 7.8, 16, 120, 40],
];

describe.each(CASES)('sampleLayout (%s)', (_name, cw, ch, cols, rows) => {
  const { lines, rects } = sampleLayout(cw, ch, cols, rows);

  it('gives both words the same left and right edge', () => {
    expect(lines).toHaveLength(2);
    expect(lines[0].x0).toBe(lines[1].x0);
    expect(lines[0].x1).toBe(lines[1].x1);
  });

  it('centres the ink: left and right margins differ by at most half a cell (plus pixel rounding)', () => {
    const left = lines[0].x0,
      right = cols * cw - lines[0].x1;
    expect(Math.abs(left - right)).toBeLessThanOrEqual(cw / 2 + 2);
  });

  it('centres the ink vertically: top and bottom margins differ by at most half a cell (plus pixel rounding)', () => {
    const top = lines[0].y0,
      bottom = rows * ch - lines[1].y1;
    expect(Math.abs(top - bottom)).toBeLessThanOrEqual(ch / 2 + 2);
  });

  it('keeps the two words apart and inside the canvas', () => {
    expect(lines[0].y1).toBeLessThan(lines[1].y0);
    expect(lines[0].x0).toBeGreaterThanOrEqual(0);
    expect(lines[0].x1).toBeLessThanOrEqual(Math.ceil(cols * cw));
    expect(lines[1].y1).toBeLessThanOrEqual(rows * ch);
    expect(rects.length).toBeGreaterThan(50);
  });
});

describe('sampleLayout scale', () => {
  it('uses the biggest scale that fits (a font pixel is k/2 cells)', () => {
    const big = sampleLayout(8, 16, 51, 26).rects[0];
    const small = sampleLayout(8, 16, 24, 12).rects[0];
    expect(big.w).toBeGreaterThan(small.w);
  });
});
