import { describe, expect, it } from 'vitest';
import { bounds, exportAs, type ExportGrid } from '../../src/export';

const opts = { spaceChar: '.', fence: false };

// 4×2 grid:  " ab "
//            "  c "   (a is red, everything else uses the theme ink)
const src: ExportGrid = {
  grid: [' ', 'a', 'b', ' ', ' ', ' ', 'c', ' '],
  colors: [null, '#ff0000', null, null, null, null, null, null],
  cols: 4,
  rows: 2,
};

describe('bounds', () => {
  it('is null for an empty canvas', () => {
    expect(bounds({ grid: [' ', ' '], colors: [null, null], cols: 2, rows: 1 })).toBeNull();
  });

  it('crops to the non-space cells', () => {
    expect(bounds(src)).toEqual({ t: 0, b: 1, l: 1, r: 2 });
  });
});

describe('exportAs', () => {
  it('returns an empty string when nothing is drawn', () => {
    const empty: ExportGrid = { grid: [' ', ' '], colors: [null, null], cols: 2, rows: 1 };
    expect(exportAs('text', empty, opts)).toBe('');
  });

  it('crops margins, trims trailing spaces and swaps leading spaces for spaceChar', () => {
    expect(exportAs('text', src, opts)).toBe('ab\n.c');
  });

  it('wraps text in a fence on request', () => {
    expect(exportAs('text', src, { ...opts, fence: true })).toBe('```\nab\n.c\n```');
  });

  it('emits coloured spans for html, leaving spaces untouched', () => {
    expect(exportAs('html', src, opts)).toBe(
      '<pre style="font-family:ui-monospace,Menlo,Consolas,monospace;line-height:1.15">' +
        '<span style="color:#ff0000">a</span>b\n c</pre>',
    );
  });

  it('escapes html metacharacters', () => {
    const s: ExportGrid = { grid: ['<', '&', '>'], colors: [null, null, null], cols: 3, rows: 1 };
    expect(exportAs('html', s, opts)).toContain('&lt;&amp;&gt;');
  });

  it('emits truecolor escapes for ansi and resets to default colour', () => {
    expect(exportAs('ansi', src, opts)).toBe('\x1b[38;2;255;0;0ma\x1b[39mb\n.\x1b[39mc');
  });

  it('closes a colour that runs to the end of the line', () => {
    const s: ExportGrid = { grid: ['a'], colors: ['#00ff00'], cols: 1, rows: 1 };
    expect(exportAs('ansi', s, opts)).toBe('\x1b[38;2;0;255;0ma\x1b[0m');
    expect(exportAs('html', s, opts)).toContain('<span style="color:#00ff00">a</span>');
  });
});
