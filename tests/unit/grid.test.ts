import { describe, expect, it } from 'vitest';
import { bufferSize, clampGrid, fitScale, LIMITS, parseDim } from '../../src/grid';

describe('clampGrid', () => {
  it('keeps in-range values', () => {
    expect(clampGrid(60, 30)).toEqual({ cols: 60, rows: 30 });
  });

  it('clamps to the limits', () => {
    expect(clampGrid(999, 999)).toEqual({ cols: LIMITS.maxCols, rows: LIMITS.maxRows });
    expect(clampGrid(0, -5)).toEqual({ cols: LIMITS.minCols, rows: LIMITS.minRows });
  });

  it('rounds to whole cells', () => {
    expect(clampGrid(40.4, 10.6)).toEqual({ cols: 40, rows: 11 });
  });
});

describe('parseDim', () => {
  it('parses numbers, including padded and fractional text', () => {
    expect(parseDim('42', 7)).toBe(42);
    expect(parseDim(' 12.5 ', 7)).toBe(12.5);
  });

  it('falls back on empty or non-numeric text', () => {
    expect(parseDim('', 7)).toBe(7);
    expect(parseDim('   ', 7)).toBe(7);
    expect(parseDim('abc', 7)).toBe(7);
    expect(parseDim('Infinity', 7)).toBe(7);
  });
});

describe('bufferSize', () => {
  it('rounds the width up so every column fits, and uses whole rows', () => {
    expect(bufferSize({ cols: 40, rows: 10 }, 7.8, 16)).toEqual({ W: 312, H: 160 });
    expect(bufferSize({ cols: 3, rows: 2 }, 7.81, 16)).toEqual({ W: 24, H: 32 });
  });
});

describe('fitScale', () => {
  it('is limited by whichever side is tighter', () => {
    expect(fitScale(400, 100, 200, 1000)).toBe(0.5); // width-bound
    expect(fitScale(100, 400, 1000, 200)).toBe(0.5); // height-bound
  });

  it('scales small canvases up', () => {
    expect(fitScale(100, 50, 400, 400)).toBe(4);
  });

  it('never returns zero', () => {
    expect(fitScale(1e9, 1e9, 1, 1)).toBeGreaterThan(0);
  });
});
