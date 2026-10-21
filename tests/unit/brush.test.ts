import { describe, expect, it } from 'vitest';
import { RING_MIN, ringDiameter, strokeWidth } from '../../src/brush';

describe('strokeWidth', () => {
  it('paints the slider value, and 2.5× that for the freehand eraser', () => {
    expect(strokeWidth('pen', false, 12)).toBe(12);
    expect(strokeWidth('pen', true, 12)).toBe(30);
  });

  it('erases every shape with the width it draws with, so the two cancel out', () => {
    for (const tool of ['line', 'circle', 'rect', 'text'] as const) {
      expect(strokeWidth(tool, true, 12), tool).toBe(12);
      expect(strokeWidth(tool, false, 12), tool).toBe(12);
    }
  });
});

describe('ringDiameter', () => {
  it('matches the stroke width when it is large enough to see', () => {
    expect(ringDiameter('pen', false, 20)).toBe(20);
    expect(ringDiameter('pen', true, 20)).toBe(50);
    expect(ringDiameter('rect', true, 20)).toBe(20);
  });

  it('follows the display scale but keeps the minimum', () => {
    expect(ringDiameter('pen', false, 20, 0.5)).toBe(10);
    expect(ringDiameter('pen', false, 20, 0.1)).toBe(RING_MIN);
    expect(ringDiameter('pen', true, 20, 2)).toBe(100);
  });

  it('never drops below the minimum visible ring', () => {
    expect(ringDiameter('pen', false, 2)).toBe(RING_MIN);
    expect(ringDiameter('pen', true, 2)).toBe(RING_MIN); // 5 < 6
  });
});
