import type { ExportKind } from './types';

export interface ExportGrid {
  grid: string[];
  colors: (string | null)[];
  cols: number;
  rows: number;
}

export interface ExportOptions {
  /** replaces ' ' in text and ANSI output */
  spaceChar: string;
  /** wrap text/ANSI output in a ``` fence */
  fence: boolean;
}

interface Bounds {
  t: number;
  b: number;
  l: number;
  r: number;
}

/** Bounding box of non-empty cells, so exports carry no blank margins. */
export function bounds({ grid, cols, rows }: ExportGrid): Bounds | null {
  let t = rows,
    b = -1,
    l = cols,
    r = -1;
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++)
      if (grid[j * cols + i] !== ' ') {
        t = Math.min(t, j);
        b = Math.max(b, j);
        l = Math.min(l, i);
        r = Math.max(r, i);
      }
  return b < 0 ? null : { t, b, l, r };
}

const esc = (c: string): string =>
  c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c;

/** Serialise the converted grid; returns '' when nothing is drawn. */
export function exportAs(kind: ExportKind, src: ExportGrid, opts: ExportOptions): string {
  const { grid, colors, cols } = src;
  const bx = bounds(src);
  if (!bx) return '';
  const lines: string[] = [];
  for (let j = bx.t; j <= bx.b; j++) {
    let end = bx.r;
    while (end >= bx.l && grid[j * cols + end] === ' ') end--;
    let line = '',
      cur: string | null | undefined;
    for (let i = bx.l; i <= end; i++) {
      const k = j * cols + i,
        c = grid[k],
        col = c === ' ' ? cur : colors[k] || null;
      if (kind !== 'text' && col !== cur) {
        if (kind === 'html')
          line += (cur ? '</span>' : '') + (col ? `<span style="color:${col}">` : '');
        else
          line += col
            ? `\x1b[38;2;${parseInt(col.slice(1, 3), 16)};${parseInt(col.slice(3, 5), 16)};${parseInt(col.slice(5, 7), 16)}m`
            : '\x1b[39m';
        cur = col;
      }
      line += kind === 'html' ? esc(c) : c === ' ' ? opts.spaceChar : c;
    }
    if (kind === 'html' && cur) line += '</span>';
    if (kind === 'ansi' && cur) line += '\x1b[0m';
    lines.push(line);
  }
  const body = lines.join('\n');
  if (kind === 'html')
    return `<pre style="font-family:ui-monospace,Menlo,Consolas,monospace;line-height:1.15">${body}</pre>`;
  return opts.fence ? '```\n' + body + '\n```' : body;
}
