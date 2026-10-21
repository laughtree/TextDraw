import { describe, expect, it } from 'vitest';
import { RING_MIN, ringDiameter } from '../../src/brush';

describe('ringDiameter', () => {
  it('is the stroke width (the slider value) when that is large enough to see', () => {
    expect(ringDiameter(20)).toBe(20);
    expect(ringDiameter(40)).toBe(40);
  });

  it('follows the display scale but keeps the minimum', () => {
    expect(ringDiameter(20, 0.5)).toBe(10);
    expect(ringDiameter(20, 2)).toBe(40);
    expect(ringDiameter(20, 0.1)).toBe(RING_MIN);
  });

  it('never drops below the minimum visible ring', () => {
    expect(ringDiameter(2)).toBe(RING_MIN);
    expect(ringDiameter(5)).toBe(RING_MIN);
  });
});
