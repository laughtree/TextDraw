import { describe, expect, it } from 'vitest';
import { caretBox, type CaretMetrics } from '../../src/caret';

const m: CaretMetrics = { width: 100, ascent: 48, descent: 12, capAscent: 34 };

describe('caretBox', () => {
  it('sits at the end of the text before the cursor, as tall as the letters', () => {
    const b = caretBox({ x: 20, y: 50 }, m, 48, 1);
    expect(b.left).toBe(120);
    expect(b.height).toBe(60);
    expect(b.top).toBe(50 + 34 - 48); // tall letters reach above the capitals' tops
  });

  it('starts at the click point when nothing is typed', () => {
    expect(caretBox({ x: 20, y: 50 }, { ...m, width: 0 }, 48, 1).left).toBe(20);
  });

  it('scales to CSS pixels when the grid is fitted to the stage', () => {
    const one = caretBox({ x: 20, y: 50 }, m, 48, 1),
      two = caretBox({ x: 20, y: 50 }, m, 48, 2);
    expect(two.left).toBe(one.left * 2);
    expect(two.top).toBe(one.top * 2);
    expect(two.height).toBe(one.height * 2);
  });

  it('grows with the font but stays between 2 and 6 px wide', () => {
    expect(caretBox({ x: 0, y: 0 }, m, 12, 1).width).toBe(2);
    expect(caretBox({ x: 0, y: 0 }, m, 48, 1).width).toBe(3);
    expect(caretBox({ x: 0, y: 0 }, m, 160, 1).width).toBe(6);
    expect(caretBox({ x: 0, y: 0 }, m, 160, 4).width).toBe(6);
  });
});
