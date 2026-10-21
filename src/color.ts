// grey mode works in linear luminance Y: matching Y means matching CIELAB L*
export const lin = (c: number): number => {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const lumCache = new Map<number, number>();
export function lum(r: number, g: number, b: number): number {
  const k = (r << 16) | (g << 8) | b;
  let v = lumCache.get(k);
  if (v === undefined) {
    v = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    lumCache.set(k, v);
  }
  return v;
}

/** Luminance of a `#rrggbb` string; anything unparsable counts as black. */
export function lumOfCss(value: string): number {
  const m = value.match(/[0-9a-f]{2}/gi) ?? ['00', '00', '00'];
  const [r, g, b] = m.slice(0, 3).map((h) => parseInt(h, 16));
  return lum(r, g, b);
}

export const hex = (r: number, g: number, b: number): string =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
