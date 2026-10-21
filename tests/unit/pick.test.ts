import { describe, expect, it } from 'vitest';
import { pickTarget } from '../../src/pick';

const CW = 10,
  CH = 20;
/** build a grid from rows of text: '.' is blank */
const grid = (...rows: string[]) => rows.flatMap((r) => [...r].map((c) => (c === '.' ? ' ' : c)));
const at = (cols: number, i: number, j: number) => j * cols + i;
// cell (i, j) centre in buffer px
const cx = (i: number) => i * CW + CW / 2;
const cy = (j: number) => j * CH + CH / 2;

describe('pickTarget', () => {
  const g = grid('.....', '..x..', '.....');
  const hit = (x: number, y: number) => pickTarget(g, 5, 3, CW, CH, x, y);

  it('takes the character under the pointer wherever it is in the cell', () => {
    const k = at(5, 2, 1);
    for (const [dx, dy] of [
      [0.5, 0.5],
      [0.05, 0.05],
      [0.95, 0.95],
      [0.05, 0.95],
      [0.95, 0.05],
    ]) {
      expect(hit((2 + dx) * CW, (1 + dy) * CH)).toBe(k);
    }
  });

  it('snaps from an empty cell to a character in a neighbouring cell', () => {
    const k = at(5, 2, 1);
    for (const [i, j] of [
      [1, 0],
      [2, 0],
      [3, 0],
      [1, 1],
      [3, 1],
      [1, 2],
      [2, 2],
      [3, 2],
    ]) {
      expect(hit(cx(i), cy(j)), `from cell ${i},${j}`).toBe(k);
    }
  });

  it('finds nothing more than one cell away', () => {
    expect(hit(cx(0), cy(0))).toBeNull();
    expect(hit(cx(4), cy(2))).toBeNull();
    expect(hit(cx(0), cy(1))).toBeNull(); // two cells left of the x
  });

  it('prefers the closer of two characters, measuring in cells', () => {
    const two = grid('x...x');
    // the empty middle cell (2) has no character in a neighbouring cell
    expect(pickTarget(two, 5, 1, CW, CH, 2.8 * CW, CH / 2)).toBeNull();
    const near = grid('.x.x.');
    expect(pickTarget(near, 5, 1, CW, CH, 2.2 * CW, CH / 2)).toBe(1); // cell 2: left (1) is closer
    expect(pickTarget(near, 5, 1, CW, CH, 2.8 * CW, CH / 2)).toBe(3); // right (3) is closer
  });

  it('breaks ties toward the upper, then the left character', () => {
    const tie = grid('x.x', '...', 'x.x');
    // the centre cell is equally far from all four corners
    expect(pickTarget(tie, 3, 3, CW, CH, cx(1), cy(1))).toBe(at(3, 0, 0));
    const lr = grid('x.x');
    expect(pickTarget(lr, 3, 1, CW, CH, cx(1), cy(0))).toBe(0);
  });

  it('gives the second half of a wide character to the cell on its left', () => {
    const wide = [' ', '字', '', ' '];
    expect(pickTarget(wide, 4, 1, CW, CH, cx(2), cy(0))).toBe(1);
    expect(pickTarget(wide, 4, 1, CW, CH, cx(1), cy(0))).toBe(1);
    expect(pickTarget(wide, 4, 1, CW, CH, cx(3), cy(0))).toBe(1); // a blank next to it snaps to the same character
  });

  it('clamps a pointer past the edge into the grid, and copes with an empty grid', () => {
    expect(pickTarget(grid('..x'), 3, 1, CW, CH, 999, 5)).toBe(2);
    expect(pickTarget([], 0, 0, CW, CH, 5, 5)).toBeNull();
  });
});
