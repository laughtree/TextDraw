import type { Grid } from './grid';
import type { Mode, Palette, Tool } from './types';

/** Mutable app state shared by the drawing, rendering and UI modules. */
export const state = {
  // tools and options
  tool: 'pen' as Tool,
  mode: 'braille' as Mode,
  palette: 'color' as Palette,
  under: false,
  size: 5,
  penColor: '#000000',
  customRamp: Array.from(' .oO@'),
  spaceChar: '⠀',
  fence: false,
  /** target platform id (see platforms.ts); null = none, no budget readout */
  platform: null as string | null,

  // pointer
  drawing: false,
  last: null as { x: number; y: number } | null,

  /** user-chosen grid; null follows the window size (auto) */
  fixed: null as Grid | null,

  // canvas geometry
  W: 0,
  H: 0,
  cw: 8,
  ch: 16,
  cols: 0,
  rows: 0,
  dpr: 1,
  /** CSS px per buffer px: 1 in auto mode, below/above 1 when a fixed grid is fitted to the stage */
  scale: 1,
  /** screen pixels per buffer px used when painting the view (dpr × scale) */
  renderScale: 1,
  fontPx: 13,

  /** repaint requested; consumed by render() */
  dirty: true,

  // result of the last conversion
  grid: [] as string[],
  gridCol: [] as (string | null)[],
};
