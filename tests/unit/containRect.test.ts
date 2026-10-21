import { describe, expect, it } from 'vitest';
import { containRect } from '../../src/grid';

describe('containRect', () => {
  it('centres a wide picture with bars above and below', () => {
    const r = containRect(200, 100, 100, 100);
    expect(r).toEqual({ x: 0, y: 25, w: 100, h: 50 });
  });
  it('centres a tall picture with bars left and right', () => {
    const r = containRect(100, 200, 100, 100);
    expect(r).toEqual({ x: 25, y: 0, w: 50, h: 100 });
  });
  it('fills the target when the proportions match', () => {
    expect(containRect(40, 20, 160, 80)).toEqual({ x: 0, y: 0, w: 160, h: 80 });
  });
  it('scales small pictures up and keeps extreme ones inside', () => {
    const r = containRect(1, 1000, 300, 200);
    expect(r.h).toBeCloseTo(200);
    expect(r.w).toBeCloseTo(0.2);
    expect(r.x + r.w / 2).toBeCloseTo(150);
  });
});
