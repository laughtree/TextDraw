import { describe, expect, it } from 'vitest';
import { normalizeBox } from '../../src/shapes';

describe('normalizeBox', () => {
  const expected = { x: 10, y: 20, w: 30, h: 40 };

  it('gives the same box whichever corner the drag started from', () => {
    expect(normalizeBox({ x: 10, y: 20 }, { x: 40, y: 60 })).toEqual(expected);
    expect(normalizeBox({ x: 40, y: 60 }, { x: 10, y: 20 })).toEqual(expected);
    expect(normalizeBox({ x: 40, y: 20 }, { x: 10, y: 60 })).toEqual(expected);
    expect(normalizeBox({ x: 10, y: 60 }, { x: 40, y: 20 })).toEqual(expected);
  });

  it('has no size for a click', () => {
    expect(normalizeBox({ x: 5, y: 5 }, { x: 5, y: 5 })).toEqual({ x: 5, y: 5, w: 0, h: 0 });
  });
});
