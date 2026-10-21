import { describe, expect, it } from 'vitest';
import { bounds, exportAs, type ExportGrid } from '../../src/export';
import type { ExportKind } from '../../src/types';

const SPACES: [string, string][] = [
  ['standard', ' '],
  ['no-break', ' '],
  ['braille blank', '⠀'],
];
const KINDS: ExportKind[] = ['text', 'html', 'ansi'];

/** rows of text → grid; '.' is a blank cell, `colors` maps a character to its colour */
function make(rows: string[], colors: Record<string, string> = {}): ExportGrid {
  const cols = Math.max(...rows.map((r) => [...r].length));
  const grid: string[] = [],
    cs: (string | null)[] = [];
  for (const r of rows) {
    const cells = [...r.padEnd(cols, '.')];
    for (const c of cells) {
      grid.push(c === '.' ? ' ' : c);
      cs.push(c === '.' ? null : (colors[c] ?? null));
    }
  }
  return { grid, colors: cs, cols, rows: rows.length };
}

const ESC = String.fromCharCode(27);
const ANSI = new RegExp(`${ESC}\\[[0-9;]*m`, 'g');
const unescapeHtml = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** the lines of an export with the format's markup removed */
function lines(kind: ExportKind, out: string): string[] {
  if (kind === 'ansi') return out.replace(ANSI, '').split('\n');
  if (kind === 'html') {
    const body = out.replace(/^<pre[^>]*>/, '').replace(/<\/pre>$/, '');
    return unescapeHtml(body.replace(/<\/?span[^>]*>/g, '')).split('\n');
  }
  return out.split('\n');
}

const SHAPE = make(['...A....', '..BCD...', '.EF.GH.I', '..J..K..', '.......L']);
const COLOURS = { A: '#da1e28', C: '#0f62fe', G: '#24a148', L: '#8a3ffc' };
const HARD = make(['..<&>..', '.x...y.', '..⠁⠃..'], { x: '#da1e28' });

describe.each(KINDS)('%s export', (kind) => {
  const opts = (spaceChar: string, fence = false) => ({ spaceChar, fence });

  it.each(SPACES)('writes blank cells as the %s substitute and nothing else changes', (_n, ch) => {
    const std = lines(kind, exportAs(kind, SHAPE, opts(' ')));
    const got = lines(kind, exportAs(kind, SHAPE, opts(ch)));
    expect(got).toHaveLength(std.length);
    // swapping the substitute back to a space gives the standard export again
    expect(got.map((l) => l.replaceAll(ch, ' '))).toEqual(std);
    // and a real character is never touched
    for (const l of got) {
      for (const c of l)
        expect(c === ch || /[A-L]/.test(c), `unexpected ${JSON.stringify(c)}`).toBe(true);
    }
  });

  it.each(SPACES)('keeps every character on its own column (%s)', (_n, ch) => {
    for (const g of [SHAPE, HARD]) {
      const bx = bounds(g)!;
      const out = lines(kind, exportAs(kind, g, opts(ch)));
      expect(out).toHaveLength(bx.b - bx.t + 1);
      for (let j = bx.t; j <= bx.b; j++) {
        const row = [...out[j - bx.t]];
        for (let i = bx.l; i <= bx.r; i++) {
          const cell = g.grid[j * g.cols + i];
          if (cell === ' ') continue; // blank cells may be cut off at the end of a line
          expect(row[i - bx.l], `cell ${i},${j}`).toBe(cell);
        }
      }
    }
  });

  it.each(SPACES)(
    'keeps the indentation of each line and trims only trailing blanks (%s)',
    (_n, ch) => {
      const out = lines(kind, exportAs(kind, SHAPE, opts(ch)));
      // left bound is column 1 (E, J), so "...A...." becomes two blanks, then A
      expect(out[0]).toBe(`${ch}${ch}A`);
      expect(out[1]).toBe(`${ch}BCD`);
      expect(out[2]).toBe(`EF${ch}GH${ch}I`);
      expect(out[3]).toBe(`${ch}J${ch}${ch}K`);
      expect(out[4]).toBe(`${ch.repeat(6)}L`);
      for (const l of out) expect(l.endsWith(ch)).toBe(false);
    },
  );
});

describe('formats around the picture', () => {
  it('fences only the plain text and the ANSI output', () => {
    const o = { spaceChar: ' ', fence: true };
    expect(exportAs('text', SHAPE, o).startsWith('```\n')).toBe(true);
    expect(exportAs('text', SHAPE, o).endsWith('\n```')).toBe(true);
    expect(exportAs('ansi', SHAPE, o).startsWith('```\n')).toBe(true);
    expect(exportAs('html', SHAPE, o).startsWith('<pre')).toBe(true);
    expect(exportAs('html', SHAPE, o)).not.toContain('```');
  });

  it('escapes markup characters in HTML but leaves the substitute alone', () => {
    const html = exportAs('html', HARD, { spaceChar: '⠀', fence: false });
    expect(html).toContain('&lt;&amp;&gt;');
    expect(html).not.toContain('&#');
    expect(html).toContain('⠀');
  });

  it('colours the HTML and the ANSI output with the drawn colours, blanks inside a colour included', () => {
    const o = { spaceChar: '⠀', fence: false };
    expect(exportAs('html', make(['x.x'], { x: '#da1e28' }), o)).toContain(
      '<span style="color:#da1e28">x⠀x</span>',
    );
    expect(exportAs('ansi', make(['x.x'], { x: '#da1e28' }), o)).toBe(
      '\x1b[38;2;218;30;40mx⠀x\x1b[0m',
    );
  });

  it('says nothing when nothing is drawn', () => {
    for (const k of KINDS)
      expect(exportAs(k, make(['...', '...']), { spaceChar: ' ', fence: false })).toBe('');
  });
});

describe('colours do not disturb the layout', () => {
  it('has the same visible text with and without colours', () => {
    const coloured = make(['..A..', '.B.C.'], COLOURS);
    const plain = make(['..A..', '.B.C.']);
    for (const kind of KINDS) {
      const a = lines(kind, exportAs(kind, coloured, { spaceChar: '⠀', fence: false }));
      const b = lines(kind, exportAs(kind, plain, { spaceChar: '⠀', fence: false }));
      expect(a).toEqual(b);
    }
  });
});
