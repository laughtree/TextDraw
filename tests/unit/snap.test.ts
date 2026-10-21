import { describe, expect, it } from 'vitest';
import { snapSpan } from '../../src/snap';

const DPRS = [1, 1.25, 1.5, 2, 3];
const whole = (v: number) => Math.abs(v - Math.round(v)) < 1e-6;

describe('snapSpan', () => {
  it('puts both edges on whole device pixels, whatever the fractional position and origin', () => {
    for (const dpr of DPRS) {
      for (const [start, end, origin] of [
        [97.25, 145.5, 16.5],
        [48.4, 96.7, 0.3],
        [200.13, 248.38, 17.77],
        [0, 33.3, 0],
        [339, 404, 16],
      ]) {
        const { pos, size } = snapSpan(start, end, origin, dpr);
        expect(whole((origin + pos) * dpr), `${start} dpr ${dpr} left`).toBe(true);
        expect(whole((origin + pos + size) * dpr), `${end} dpr ${dpr} right`).toBe(true);
      }
    }
  });

  it('rounds each edge on its own, like layout does', () => {
    // at dpr 2 an edge at 10.3 is device pixel 20.6 → 21 (10.5), one at 12.2 is 24.4 → 24 (12)
    const { pos, size } = snapSpan(10.3, 12.2, 0, 2);
    expect(pos).toBe(10.5);
    expect(size).toBe(1.5);
  });

  it('keeps neighbouring buttons joined: no gap and no overlap between them', () => {
    // eight equal flex buttons of 48.25px starting at a fractional origin
    for (const dpr of DPRS) {
      const origin = 16.4;
      let prevEnd: number | null = null;
      for (let i = 0; i < 8; i++) {
        const left = origin + i * 48.25,
          right = left + 48.25;
        const { pos, size } = snapSpan(left, right, origin, dpr);
        if (prevEnd !== null)
          expect(Math.abs(pos - prevEnd), `dpr ${dpr} button ${i}`).toBeLessThan(1e-9);
        prevEnd = pos + size;
        expect(size).toBeGreaterThan(0);
      }
    }
  });

  it('never gives a negative size', () => {
    expect(snapSpan(10, 10, 0, 1).size).toBe(0);
    expect(snapSpan(10.2, 10.1, 0, 1).size).toBe(0);
  });
});
