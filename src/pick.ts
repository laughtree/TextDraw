/** A cell holds a character the eyedropper can read (anything but blank; '' is half of a wide one). */
const hasInk = (c: string | undefined): boolean => c !== undefined && c !== ' ';

/**
 * Which character does a click at (x, y) buffer pixels mean? The cell under the pointer if it holds
 * a character, otherwise the nearest character among the 8 neighbouring cells (the cell the
 * pointer is in counts as distance 0). Distances are in cells, so a cell's 1:2 shape does not skew
 * the choice; ties go to the upper, then the left one. The second half of a wide character
 * belongs to the cell on its left. Returns the cell index, or null when nothing is near.
 */
export function pickTarget(
  grid: string[],
  cols: number,
  rows: number,
  cw: number,
  ch: number,
  x: number,
  y: number,
): number | null {
  if (cols <= 0 || rows <= 0) return null;
  const fx = x / cw,
    fy = y / ch;
  const i0 = Math.min(cols - 1, Math.max(0, Math.floor(fx))),
    j0 = Math.min(rows - 1, Math.max(0, Math.floor(fy)));
  const owner = (k: number): number => {
    while (k > 0 && grid[k] === '' && k % cols !== 0) k--;
    return k;
  };
  const here = j0 * cols + i0;
  if (hasInk(grid[here])) return owner(here);

  let best: number | null = null,
    bestD = Infinity;
  for (let j = j0 - 1; j <= j0 + 1; j++) {
    for (let i = i0 - 1; i <= i0 + 1; i++) {
      if (i < 0 || j < 0 || i >= cols || j >= rows || (i === i0 && j === j0)) continue;
      const k = j * cols + i;
      if (!hasInk(grid[k])) continue;
      const d = Math.hypot(fx - (i + 0.5), fy - (j + 0.5));
      if (d < bestD - 1e-9) {
        bestD = d;
        best = k;
      }
    }
  }
  return best === null ? null : owner(best);
}
