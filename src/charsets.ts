import type { Ramp } from './types';

export const SHADE = ' .:-=+*#%@';
export const FILL = ':+*#%@';
export const SHADEBLK = ['░', '▒', '▓', '█'];
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
// quadrant blocks indexed by bitmask: 1 = top-left, 2 = top-right, 4 = bottom-left, 8 = bottom-right
export const QUAD = [
  ' ',
  '▘',
  '▝',
  '▀',
  '▖',
  '▌',
  '▞',
  '▛',
  '▗',
  '▚',
  '▐',
  '▜',
  '▄',
  '▙',
  '▟',
  '█',
];
export const MIXCHARS = Array.from(
  ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~░▒▓█▀▄▌▐▖▗▘▝▚▞▙▛▜▟',
);
export const BAYER8 = [0, 4, 6, 2, 1, 5, 7, 3].map((v) => (v + 0.5) / 8);
