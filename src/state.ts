import type { Mode, Palette, Tool } from './types';

/** Mutable app state shared by the drawing, rendering and UI modules. */
export const state = {
  // tools and options
  tool: 'pen' as Tool,
  mode: 'mix' as Mode,
  palette: 'color' as Palette,
  under: false,
  size: 5,
  penColor: '#000000',
  customRamp: Array.from(' .oO@'),
  spaceChar: '⠀',
  fence: false,

  // pointer
  drawing: false,
  last: null as { x: number; y: number } | null,

  // canvas geometry
  W: 0,
  H: 0,
  cw: 8,
  ch: 16,
  cols: 0,
  rows: 0,
  dpr: 1,
  fontPx: 13,

  /** repaint requested; consumed by render() */
  dirty: true,

  // result of the last conversion
  grid: [] as string[],
  gridCol: [] as (string | null)[],
};
