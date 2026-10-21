/** Smallest footprint ring we draw, so thin pens stay visible. */
export const RING_MIN = 6;

/**
 * On-screen ring diameter in CSS px: the stroke width (the slider value, for drawing and erasing
 * alike) times the display scale, but never tiny.
 */
export const ringDiameter = (size: number, scale = 1): number => Math.max(RING_MIN, size * scale);
