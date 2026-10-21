import { beforeEach, describe, expect, it } from 'vitest';
import { convert, type ConvertOptions } from '../../src/convert';
import { clearGlyphCaches } from '../../src/glyphs';
import type { Metrics, Mode, Palette } from '../../src/types';

const MODES: Mode[] = ['mix', 'braille', 'block', 'shade', 'dots', 'cjk', 'line', 'custom'];

// 20×4 cells of 8×16 px
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
