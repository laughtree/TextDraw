import type { Tool } from './types';

/**
 * Line width, in canvas pixels, that a stroke actually paints. Only the freehand eraser is wider
 * than the slider (it needs to be); shapes erase with the same width they draw with, so erasing
 * a shape exactly cancels drawing it.
 */
export const strokeWidth = (tool: Tool, erase: boolean, size: number): number =>
  tool === 'pen' && erase ? size * 2.5 : size;

/** Smallest footprint ring we draw, so thin pens stay visible. */
export const RING_MIN = 6;

/** On-screen ring diameter in CSS px: the stroke width times the display scale, but never tiny. */
export const ringDiameter = (tool: Tool, erase: boolean, size: number, scale = 1): number =>
  Math.max(RING_MIN, strokeWidth(tool, erase, size) * scale);
