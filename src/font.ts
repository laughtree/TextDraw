// A 7 × 7 block font for the starter picture. Every letter has ink in its first and its last
// column, so all letters are exactly as wide as each other and words line up at both edges.
// `#` is ink; row strings are left to right.
const ART: Record<string, string[]> = {
  D: ['#####..', '##..##.', '##...##', '##...##', '##...##', '##..##.', '#####..'],
  R: ['######.', '##...##', '##...##', '######.', '##.##..', '##..##.', '##...##'],
  A: ['..###..', '.##.##.', '##...##', '##...##', '#######', '##...##', '##...##'],
  W: ['##...##', '##...##', '##...##', '##.#.##', '#######', '###.###', '##...##'],
  T: ['#######', '#######', '..###..', '..###..', '..###..', '..###..', '..###..'],
  E: ['#######', '##.....', '##.....', '#####..', '##.....', '##.....', '#######'],
  X: ['##...##', '.##.##.', '..###..', '..###..', '..###..', '.##.##.', '##...##'],
};

export const GLYPH_W = 7;
export const GLYPH_H = 7;
/** distance from one letter to the next: the glyph plus one empty column */
export const PITCH = 8;

/** Rows as bitmasks, bit 0 = leftmost column. */
export const FONT: Record<string, number[]> = Object.fromEntries(
  Object.entries(ART).map(([ch, rows]) => [
    ch,
    rows.map((r) => [...r].reduce((bits, c, i) => (c === '#' ? bits | (1 << i) : bits), 0)),
  ]),
);

/** The words painted when the app starts, one per line. */
export const SAMPLE_LINES = ['DRAW', 'TEXT'];
