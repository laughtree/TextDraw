import type { Tool } from './types';

/** Line width, in canvas pixels, that a stroke with this tool and slider value actually paints. */
export const strokeWidth = (tool: Tool, size: number): number =>
  tool === 'erase' ? size * 2.5 : size;

/** Smallest footprint ring we draw, so thin pens stay visible. */
export const RING_MIN = 6;

export const ringDiameter = (tool: Tool, size: number): number =>
  Math.max(RING_MIN, strokeWidth(tool, size));
