/**
 * Where an overlay must sit so its edges land on the same device pixels as the element it covers.
 * The browser snaps an element's left and right edges (and top and bottom) to whole device pixels
 * on its own; a layer placed at the element's fractional position would end up half a pixel off
 * and leave a hairline gap. Both edges are rounded separately, as layout does, and the result is
 * relative to `origin` (the container's inner edge, which may itself be fractional).
 */
export function snapSpan(
  start: number,
  end: number,
  origin: number,
  dpr: number,
): { pos: number; size: number } {
  const s = Math.round(start * dpr) / dpr,
    e = Math.round(end * dpr) / dpr;
  return { pos: s - origin, size: Math.max(0, e - s) };
}
