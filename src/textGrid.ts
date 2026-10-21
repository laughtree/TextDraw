import { LIMITS } from './grid';

/** Text art laid out on cells: one entry per cell, '' marks the second half of a full-width glyph. */
export interface Art {
  lines: string[][];
  cols: number;
  rows: number;
  /** something was cut off to stay within the grid limits */
  cropped: boolean;
}

const ESC = String.fromCharCode(27);
const ANSI = new RegExp(`${ESC}\\[[0-9;?]*[ -/]*[@-~]`, 'g');
const TAB = 4;

/** Blank cells: space, no-break space and the braille blank. */
export const isBlank = (c: string): boolean => c === ' ' || c === ' ' || c === '⠀' || !c;

/** Cells a character spans: 2 for East Asian wide and full-width forms and emoji, 1 otherwise. */
export function cellWidth(c: string): number {
  const cp = c.codePointAt(0) ?? 0;
  const wide =
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0xa4cf && cp !== 0x303f) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe6f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x1f300 && cp <= 0x1f64f) ||
    (cp >= 0x1f900 && cp <= 0x1f9ff) ||
    (cp >= 0x20000 && cp <= 0x3fffd);
  return wide ? 2 : 1;
}

/** Zero-width characters and combining marks have no cell of their own. */
const zeroWidth = (cp: number, c: string): boolean =>
  (cp >= 0x200b && cp <= 0x200f) || cp === 0xfeff || /\p{M}/u.test(c);

function layoutLine(text: string): string[] {
  const cells: string[] = [];
  for (const c of text) {
    const cp = c.codePointAt(0) ?? 0;
    if (c === '\t') {
      do cells.push(' ');
      while (cells.length % TAB !== 0);
    } else if (cp < 0x20 || cp === 0x7f || zeroWidth(cp, c)) {
      continue;
    } else {
      cells.push(c);
      if (cellWidth(c) === 2) cells.push('');
    }
  }
  while (cells.length && isBlank(cells[cells.length - 1])) cells.pop(); // padding is not content
  return cells;
}

/**
 * Lay text art out on a grid: line breaks and tabs normalised, colour codes dropped, one entry per
 * cell. The grid is as wide as the longest line and as tall as the text, cut to the grid limits.
 */
export function parseArt(text: string): Art {
  const raw = text.replace(ANSI, '').replace(/\r\n?/g, '\n').split('\n');
  while (raw.length && layoutLine(raw[raw.length - 1]).length === 0) raw.pop();
  let cropped = raw.length > LIMITS.maxRows;
  const lines = raw.slice(0, LIMITS.maxRows).map((l) => {
    const cells = layoutLine(l);
    if (cells.length <= LIMITS.maxCols) return cells;
    cropped = true;
    const cut = cells.slice(0, LIMITS.maxCols);
    if (cut[cut.length - 1] !== '' && cellWidth(cut[cut.length - 1]) === 2) cut.pop(); // half a glyph
    return cut;
  });
  return {
    lines,
    cols: lines.reduce((n, l) => Math.max(n, l.length), 0),
    rows: lines.length,
    cropped,
  };
}
