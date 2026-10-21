import { beforeEach, describe, expect, it } from 'vitest';
import { BLOCK_CHARS } from '../../src/blocks';
import { convert, type ConvertOptions } from '../../src/convert';
import { clearGlyphCaches } from '../../src/glyphs';
import type { Metrics, Mode, Palette } from '../../src/types';

const MODES: Mode[] = ['mix', 'braille', 'block', 'shade', 'dots', 'cjk', 'line', 'custom'];

// 20×4 cells of 8×16 px, so a 2×4 zone is 4×4 px
const m: Metrics = {
  W: 160,
  H: 64,
  cw: 8,
  ch: 16,
  cols: 20,
  rows: 4,
  fontPx: 13,
  font: 'monospace',
};

function paint(draw: (ctx: CanvasRenderingContext2D) => void): Uint8ClampedArray {
  const canvas = document.createElement('canvas');
  canvas.width = m.W;
  canvas.height = m.H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('no 2d context');
  draw(ctx);
  return ctx.getImageData(0, 0, m.W, m.H).data;
}

function run(px: Uint8ClampedArray, mode: Mode, palette: Palette = 'color') {
  const opts: ConvertOptions = {
    mode,
    palette,
    customRamp: Array.from(' .oO@'),
    Ybg: 1,
    Yink: 0.01,
  };
  return convert(px, m, opts);
}

const isBraille = (c: string) => c.charCodeAt(0) >= 0x2800 && c.charCodeAt(0) <= 0x28ff;
const isBlock = (c: string) => BLOCK_CHARS.includes(c);

/** a busy picture: thin and thick lines, curves, filled shapes, anti-aliased edges */
function scribble(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#000';
  ctx.strokeStyle = '#000';
  ctx.fillRect(10, 5, 30, 20);
  ctx.fillRect(60, 40, 3, 20);
  for (const [w, y] of [
    [1, 30],
    [2, 36],
    [5, 50],
  ]) {
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(160, y + 6);
    ctx.stroke();
  }
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(110, 28, 20, 0, Math.PI * 2);
  ctx.stroke();
}

beforeEach(() => clearGlyphCaches());

describe('convert', () => {
  it.each(MODES)('turns an empty canvas into blank cells (%s)', (mode) => {
    const { chars, colors } = run(
      paint(() => {}),
      mode,
    );
    expect(chars).toHaveLength(m.cols * m.rows);
    expect(chars.every((c) => c === ' ' || c === '')).toBe(true);
    expect(colors.every((c) => c === null)).toBe(true);
  });

  it('fills covered cells with full braille / block characters', () => {
    // covers cells (0..1, 0..1)
    const px = paint((ctx) => ctx.fillRect(0, 0, 16, 32));
    const braille = run(px, 'braille').chars;
    expect(braille[0]).toBe('⣿');
    expect(braille[m.cols + 1]).toBe('⣿');
    expect(braille[2]).toBe(' ');
    const block = run(px, 'block').chars;
    expect(block[0]).toBe('█');
    expect(block[m.cols + 1]).toBe('█');
    expect(block[2]).toBe(' ');
  });

  it('inks fully covered cells with a non-blank glyph in every character mode', () => {
    const px = paint((ctx) => ctx.fillRect(0, 0, 16, 32));
    for (const mode of ['mix', 'shade', 'dots', 'custom', 'line'] as Mode[]) {
      const { chars } = run(px, mode);
      expect(chars[0], mode).not.toBe(' ');
      expect(chars[m.cols * m.rows - 1], mode).toBe(' ');
    }
  });

  it('keeps colour in colour mode and drops it in grey mode', () => {
    const px = paint((ctx) => {
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, 16, 32);
    });
    expect(run(px, 'block', 'color').colors[0]).toBe('#ff0000');
    expect(run(px, 'block', 'gray').colors[0]).toBeNull();
  });

  it('treats near-black ink as theme ink (no colour)', () => {
    const px = paint((ctx) => ctx.fillRect(0, 0, 16, 32));
    expect(run(px, 'block', 'color').colors[0]).toBeNull();
  });

  it('draws a horizontal stroke with line characters', () => {
    const px = paint((ctx) => ctx.fillRect(0, 22, 160, 4));
    const row1 = run(px, 'line').chars.slice(m.cols, m.cols * 2);
    expect(row1.filter((c) => '-_`'.includes(c)).length).toBeGreaterThan(10);
  });

  it('lays full-width glyphs over two cells in cjk mode', () => {
    const px = paint((ctx) => ctx.fillRect(0, 0, 16, 32));
    const { chars } = run(px, 'cjk');
    expect(chars[0]).not.toBe(' ');
    expect(chars[1]).toBe('');
  });
});

describe('block mode', () => {
  const first = (draw: (ctx: CanvasRenderingContext2D) => void) =>
    run(paint(draw), 'block').chars[0];

  it('picks halves and quadrants', () => {
    expect(first((c) => c.fillRect(0, 0, 8, 8))).toBe('▀');
    expect(first((c) => c.fillRect(0, 8, 8, 8))).toBe('▄');
    expect(first((c) => c.fillRect(0, 0, 4, 16))).toBe('▌');
    expect(first((c) => c.fillRect(0, 0, 4, 8))).toBe('▘');
    expect(first((c) => c.fillRect(4, 8, 4, 8))).toBe('▗');
  });

  it('picks eighth blocks for thin bars hugging the bottom or left edge', () => {
    expect(first((c) => c.fillRect(0, 14, 8, 2))).toBe('▁'); // 1/8 high
    expect(first((c) => c.fillRect(0, 12, 8, 4))).toBe('▂'); // 1/4
    expect(first((c) => c.fillRect(0, 6, 8, 10))).toBe('▅'); // 5/8
    expect(first((c) => c.fillRect(0, 0, 1, 16))).toBe('▏'); // 1/8 wide
    expect(first((c) => c.fillRect(0, 0, 3, 16))).toBe('▍'); // 3/8
    expect(first((c) => c.fillRect(0, 0, 6, 16))).toBe('▊'); // 3/4
  });

  it('only ever outputs blank or block elements', () => {
    const { chars } = run(paint(scribble), 'block');
    expect(chars.some((c) => c !== ' ')).toBe(true);
    expect(chars.every((c) => c === ' ' || isBlock(c))).toBe(true);
  });
});

describe('mix mode', () => {
  it('fills a covered cell with a solid block', () => {
    expect(
      run(
        paint((c) => c.fillRect(0, 0, 16, 32)),
        'mix',
      ).chars[0],
    ).toBe('█');
  });

  it('only ever outputs blank, block elements or braille — never letters or punctuation', () => {
    const { chars } = run(paint(scribble), 'mix');
    expect(chars.some((c) => c !== ' ')).toBe(true);
    expect(chars.filter((c) => !(c === ' ' || isBlock(c) || isBraille(c)))).toEqual([]);
  });

  it('draws thin lines with braille dots', () => {
    const px = paint((ctx) => ctx.fillRect(0, 22, 160, 2)); // inside one row of zones
    const row1 = run(px, 'mix').chars.slice(m.cols, m.cols * 2);
    expect(row1.filter(isBraille).length).toBeGreaterThan(10);
  });

  it('uses both solid blocks and braille in one picture', () => {
    const { chars } = run(paint(scribble), 'mix');
    expect(chars.some(isBlock)).toBe(true);
    expect(chars.some(isBraille)).toBe(true);
  });
});
