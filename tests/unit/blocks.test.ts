import { describe, expect, it } from 'vitest';
import {
  BLOCK_CHARS,
  BLOCK_SET,
  blockPaint,
  EIGHTHS,
  QUAD,
  SHADES,
  zoneVector,
} from '../../src/blocks';

function vec(c: string): number[] {
  const paint = blockPaint(c);
  if (!paint) throw new Error(`${c} is not a block`);
  return zoneVector(paint);
}

function expectVec(c: string, expected: number[]) {
  const v = vec(c);
  expected.forEach((e, q) => expect(v[q], `${c} zone ${q}`).toBeCloseTo(e, 9));
}

// zone index = row * 2 + column; 4 rows × 2 columns
describe('zoneVector', () => {
  it('full block fills every zone', () => expectVec('█', [1, 1, 1, 1, 1, 1, 1, 1]));

  it('halves and quadrants cover whole zones', () => {
    expectVec('▀', [1, 1, 1, 1, 0, 0, 0, 0]);
    expectVec('▄', [0, 0, 0, 0, 1, 1, 1, 1]);
    expectVec('▌', [1, 0, 1, 0, 1, 0, 1, 0]);
    expectVec('▐', [0, 1, 0, 1, 0, 1, 0, 1]);
    expectVec('▘', [1, 0, 1, 0, 0, 0, 0, 0]);
    expectVec('▟', [0, 1, 0, 1, 1, 1, 1, 1]); // all but the top-left quadrant
  });

  it('shades are uniform', () => {
    expectVec('░', Array<number>(8).fill(0.25));
    expectVec('▒', Array<number>(8).fill(0.5));
    expectVec('▓', Array<number>(8).fill(0.75));
  });

  it('bottom bars grow upward in eighths', () => {
    expectVec('▁', [0, 0, 0, 0, 0, 0, 0.5, 0.5]);
    expectVec('▂', [0, 0, 0, 0, 0, 0, 1, 1]);
    expectVec('▃', [0, 0, 0, 0, 0.5, 0.5, 1, 1]);
    expectVec('▅', [0, 0, 0.5, 0.5, 1, 1, 1, 1]);
    expectVec('▇', [0.5, 0.5, 1, 1, 1, 1, 1, 1]);
  });

  it('left bars grow rightward in eighths', () => {
    expectVec('▏', [0.25, 0, 0.25, 0, 0.25, 0, 0.25, 0]);
    expectVec('▎', [0.5, 0, 0.5, 0, 0.5, 0, 0.5, 0]);
    expectVec('▍', [0.75, 0, 0.75, 0, 0.75, 0, 0.75, 0]);
    expectVec('▋', [1, 0.25, 1, 0.25, 1, 0.25, 1, 0.25]);
    expectVec('▉', [1, 0.75, 1, 0.75, 1, 0.75, 1, 0.75]);
  });
});

describe('blockPaint', () => {
  it('rejects anything that is not a block', () => {
    expect(blockPaint('a')).toBeNull();
    expect(blockPaint(' ')).toBeNull();
    expect(blockPaint('⣿')).toBeNull();
  });
});

describe('BLOCK_SET', () => {
  it('starts with blank and has no duplicates', () => {
    expect(BLOCK_SET[0].c).toBe(' ');
    expect(BLOCK_SET[0].v.every((x) => x === 0)).toBe(true);
    const chars = BLOCK_SET.map((g) => g.c);
    expect(new Set(chars).size).toBe(chars.length);
  });

  it('holds blank, 3 shades, 15 quadrant shapes and 12 eighths — nothing from ASCII', () => {
    expect(SHADES).toHaveLength(3);
    expect(QUAD.slice(1)).toHaveLength(15);
    expect(Object.keys(EIGHTHS)).toHaveLength(12);
    expect(BLOCK_CHARS).toHaveLength(30);
    expect(BLOCK_SET).toHaveLength(31);
    expect(BLOCK_CHARS.every((c) => c.charCodeAt(0) >= 0x2580 && c.charCodeAt(0) <= 0x259f)).toBe(
      true,
    );
  });

  it('gives every block a distinct ink layout', () => {
    const keys = BLOCK_SET.map((g) => g.v.map((x) => x.toFixed(6)).join(','));
    expect(new Set(keys).size).toBe(keys.length);
  });
});
