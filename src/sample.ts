import { IBM8, SAMPLE_LINES } from './font8x8';
import { state } from './state';
import { bctx } from './surface';

/** Paint the starter picture: the words in SAMPLE_LINES in the IBM PC font. */
export function sample(): void {
  // One font pixel = k × (half a cell wide, half a cell tall),
  // so every pixel sits on the cell's quadrant grid and converts cleanly. Each line takes the largest k that fits.
  const { cw, ch, cols, rows } = state;
  const lines = SAMPLE_LINES;
  const ks = lines.map((l) =>
    Math.max(1, Math.min(3, Math.floor((cols * 2) / (l.length * 8)), Math.floor((rows - 1) / 8))),
  );
  const gapR = 1,
    totalRows = ks.reduce((t, k) => t + 4 * k, 0) + gapR * (lines.length - 1);
  let row = Math.max(0, Math.floor((rows - totalRows) / 2));
  bctx.save();
  bctx.fillStyle = '#000';
  lines.forEach((line, li) => {
    const k = ks[li],
      pw = (cw / 2) * k,
      ph = (ch / 2) * k; // 1:2 pixels, like the VGA 8×16 text font
    const c0 = Math.floor((cols - (line.length * 8 * k) / 2) / 2),
      x0 = c0 * cw,
      y0 = row * ch;
    [...line].forEach((chr, ci) =>
      IBM8[chr].forEach((bits, r) => {
        for (let bit = 0; bit < 8; bit++)
          if ((bits >> bit) & 1) {
            // snap edges the same way the converter assigns pixels to cells (floor(x/cw)), so nothing leaks
            const xa = Math.ceil(x0 + (ci * 8 + bit) * pw - 1e-6),
              xb = Math.ceil(x0 + (ci * 8 + bit + 1) * pw - 1e-6),
              ya = Math.ceil(y0 + r * ph - 1e-6),
              yb = Math.ceil(y0 + (r + 1) * ph - 1e-6);
            bctx.fillRect(xa, ya, xb - xa, yb - ya);
          }
      }),
    );
    row += 4 * k + gapR;
  });
  bctx.restore();
  state.dirty = true;
}
