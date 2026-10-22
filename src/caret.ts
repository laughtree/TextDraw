import type { Point } from './shapes';

/** What the canvas says about the text before the cursor, in drawing-buffer pixels. */
export interface CaretMetrics {
  /** advance width of the text before the cursor */
  width: number;
  /** ink height above and below the baseline of tall (d, H) and hanging (g, p) letters */
  ascent: number;
  descent: number;
  /** height of a capital letter: the text tool puts the top of capitals on the click point */
  capAscent: number;
}

/** The caret as a box in CSS pixels, relative to the paper. */
export interface CaretBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Where the text cursor is and how big it is: a bar as tall as the letters, at the end of the
 * text before the cursor. `at` is the click point (buffer px), `scale` is CSS px per buffer px.
 * The bar is thin but grows a little with the font so it stays easy to see on big text.
 */
export function caretBox(at: Point, m: CaretMetrics, size: number, scale: number): CaretBox {
  return {
    left: (at.x + m.width) * scale,
    top: (at.y + m.capAscent - m.ascent) * scale,
    width: Math.min(6, Math.max(2, Math.round((size * scale) / 16))),
    height: (m.ascent + m.descent) * scale,
  };
}
