export type Tool = 'pen' | 'erase' | 'line' | 'circle' | 'rect' | 'text' | 'pick';
export type Mode = 'braille' | 'mix' | 'block' | 'shade' | 'dots' | 'cjk' | 'line' | 'custom';
export type Palette = 'color' | 'gray';
export type ExportKind = 'text' | 'html' | 'ansi';

/** Canvas geometry shared by conversion, calibration and rendering. */
export interface Metrics {
  /** buffer size in CSS pixels */
  W: number;
  H: number;
  /** cell size in CSS pixels */
  cw: number;
  ch: number;
  cols: number;
  rows: number;
  fontPx: number;
  /** resolved monospace font-family list */
  font: string;
}

/** Characters sorted by ink coverage; `v` is the normalised tone (0..1) of `c[i]`. */
export interface Ramp {
  c: string[];
  v: number[];
}
