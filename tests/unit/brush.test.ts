import { describe, expect, it } from 'vitest';
import { RING_MIN, ringDiameter, strokeWidth } from '../../src/brush';

describe('strokeWidth', () => {
  it('paints the slider value with the pen and 2.5× that with the eraser', () => {
    expect(strokeWidth('pen', 12)).toBe(12);
    expect(strokeWidth('erase', 12)).toBe(30);
  });
});

describe('ringDiameter', () => {
  it('matches the stroke width when it is large enough to see', () => {
    expect(ringDiameter('pen', 20)).toBe(20);
    expect(ringDiameter('erase', 20)).toBe(50);
  });

  it('never drops below the minimum visible ring', () => {
    expect(ringDiameter('pen', 2)).toBe(RING_MIN);
    expect(ringDiameter('erase', 2)).toBe(RING_MIN); // 5 < 6
  });
});
