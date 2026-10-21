import { describe, expect, it } from 'vitest';
import { hex, lin, lum, lumOfCss } from '../../src/color';

describe('luminance', () => {
  it('maps black to 0 and white to 1', () => {
    expect(lum(0, 0, 0)).toBe(0);
    expect(lum(255, 255, 255)).toBeCloseTo(1, 6);
  });

  it('applies the sRGB transfer curve (mid grey is far darker than 50%)', () => {
    expect(lin(128)).toBeCloseTo(0.2158, 3);
  });

  it('weights green above red above blue', () => {
    expect(lum(0, 255, 0)).toBeGreaterThan(lum(255, 0, 0));
    expect(lum(255, 0, 0)).toBeGreaterThan(lum(0, 0, 255));
  });

  it('parses #rrggbb strings and treats junk as black', () => {
    expect(lumOfCss('#ffffff')).toBeCloseTo(1, 6);
    expect(lumOfCss('')).toBe(0);
  });
});

describe('hex', () => {
  it('pads and rounds channels', () => {
    expect(hex(255, 0, 16)).toBe('#ff0010');
    expect(hex(0.4, 127.6, 255)).toBe('#0080ff');
  });
});
