import type { Ramp } from './types';

export const SHADE = ' .:-=+*#%@';
export const FILL = ':+*#%@';
// halftone dots: radius as a fraction of cell width; coverage is the dot's area
export const DOTS: ReadonlyArray<readonly [string, number]> = [
  [' ', 0],
  ['·', 0.15],
  ['•', 0.3],
  ['●', 0.48],
];
export const DOTS_R: Ramp = {
  c: DOTS.map((d) => d[0]),
  v: DOTS.map((d) => (d[1] / 0.48) ** 2),
};
export const CJK = Array.from('丶一二三工王田目回国國圖龍鬱龘');
export const BAYER8 = [0, 4, 6, 2, 1, 5, 7, 3].map((v) => (v + 0.5) / 8);
/** braille dot bit for each 2×4 zone (index = row * 2 + column): U+2800 + bit is that single dot */
export const BRAILLE_ZONE_BITS = [0x01, 0x08, 0x02, 0x10, 0x04, 0x20, 0x40, 0x80];
