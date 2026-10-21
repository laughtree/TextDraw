import { BAYER8, CJK, DOTS_R, FILL, QUAD, SHADE, SHADEBLK } from './charsets';
import { hex, lum } from './color';
import { calibrated, mixSet, pickGlyph } from './glyphs';
import type { Metrics, Mode, Palette } from './types';

export interface ConvertOptions {
  mode: Mode;
  palette: Palette;
  customRamp: string[];
  /** linear luminance of the paper and ink colours (grey mode tone mapping) */
  Ybg: number;
  Yink: number;
}

export interface ConvertResult {
  /** one entry per cell, row-major; '' marks the second half of a full-width glyph */
  chars: string[];
  /** per-cell colour (`#rrggbb`), or null to use the theme ink */
  colors: (string | null)[];
}

/** Turn the RGBA drawing buffer (W×H) into one character per cell. */
export function convert(px: Uint8ClampedArray, m: Metrics, opts: ConvertOptions): ConvertResult {
  const { W, H, cw, ch, cols, rows } = m;
  const { mode, palette, customRamp, Ybg, Yink } = opts;
  const n = cols * rows;
  const s = new Float64Array(n),
    sx = new Float64Array(n),
    sy = new Float64Array(n),
    sxx = new Float64Array(n),
    syy = new Float64Array(n),
    sxy = new Float64Array(n);
  const maxX = cols * cw,
    maxY = rows * ch;
  const subMode = mode === 'braille' || mode === 'block' || mode === 'mix';
  const sub = new Float64Array(subMode ? n * 8 : 0); // 2 cols × 4 rows per cell
  const cr = new Float64Array(n),
    cg = new Float64Array(n),
    cb = new Float64Array(n),
    cwt = new Float64Array(n),
    ik = new Float64Array(n);
  // grey mode: tone = how far a pixel pulls the cell from paper toward ink, in linear luminance
  const gray = palette === 'gray',
    st = new Float64Array(n),
    dY = Yink - Ybg || 1e-6;
  for (let y = 0; y < H && y < maxY; y++) {
    const cj = (y / ch) | 0,
      rowOff = cj * cols,
      sr = Math.min(3, (((y - cj * ch) / ch) * 4) | 0);
    for (let x = 0; x < W && x < maxX; x++) {
      const a = px[(y * W + x) * 4 + 3];
      if (!a) continue;
      const ci = (x / cw) | 0,
        w = a / 255,
        i = rowOff + ci,
        p = (y * W + x) * 4;
      const r = px[p],
        g = px[p + 1],
        bl = px[p + 2];
      let tone = 1;
      if (r < 10 && g < 10 && bl < 10) ik[i] += w;
      else {
        cr[i] += w * r;
        cg[i] += w * g;
        cb[i] += w * bl;
        cwt[i] += w;
        if (gray) tone = Math.min(1, Math.max(0, (lum(r, g, bl) - Ybg) / dY));
      }
      const wt = gray ? w * tone : w;
      st[i] += wt;
      s[i] += w;
      sx[i] += w * x;
      sy[i] += w * y;
      sxx[i] += w * x * x;
      syy[i] += w * y * y;
      sxy[i] += w * x * y;
      if (subMode) {
        const sc = (x - ci * cw) * 2 < cw ? 0 : 1;
        sub[i * 8 + sr * 2 + sc] += wt;
      }
    }
  }
  const area = cw * ch,
    out = new Array<string>(n);
  const gridCol = new Array<string | null>(n);
  for (let k = 0; k < n; k++) {
    // ink-dominant cells follow the theme; otherwise average the coloured ink
    gridCol[k] =
      !gray && cwt[k] > ik[k] ? hex(cr[k] / cwt[k], cg[k] / cwt[k], cb[k] / cwt[k]) : null;
  }
  if (subMode) {
    const subA = area / 8;
    const MV = mode === 'mix' ? mixSet(m) : [];
    for (let k = 0; k < n; k++) {
      const o = k * 8,
        on = (q: number) => sub[o + q] / subA;
      if (mode === 'mix') {
        // match the cell's 2×4 ink layout against every glyph's measured layout
        let tm = 0;
        const t = new Array<number>(8);
        for (let q = 0; q < 8; q++) {
          t[q] = Math.min(1, on(q));
          tm += t[q];
        }
        tm /= 8;
        if (tm < 0.02) {
          out[k] = ' ';
          continue;
        }
        let best = ' ',
          bd = Infinity;
        for (const g of MV) {
          let e = 0;
          for (let q = 0; q < 8; q++) {
            const d = g.v[q] - t[q];
            e += d * d;
          }
          const dm = g.m - tm;
          e += 12 * dm * dm;
          if (e < bd) {
            bd = e;
            best = g.c;
          }
        }
        out[k] = best;
        continue;
      }
      if (mode === 'braille') {
        // braille dot bits: col0 rows0-2 → 1,2,4 ; col1 rows0-2 → 8,16,32 ; row3 → 64,128
        // grey mode dithers with a 2×4 Bayer matrix so mid tones light up only some dots
        const T = (q: number) => (gray ? BAYER8[q] : 0.28);
        let b = 0;
        if (on(0) > T(0)) b |= 1;
        if (on(2) > T(2)) b |= 2;
        if (on(4) > T(4)) b |= 4;
        if (on(6) > T(6)) b |= 64;
        if (on(1) > T(1)) b |= 8;
        if (on(3) > T(3)) b |= 16;
        if (on(5) > T(5)) b |= 32;
        if (on(7) > T(7)) b |= 128;
        out[k] = b ? String.fromCharCode(0x2800 + b) : ' ';
      } else {
        // even cells get a shade block (░▒▓█) by tone; cells with an edge get a quadrant shape
        const qv = [
          sub[o] + sub[o + 2],
          sub[o + 1] + sub[o + 3],
          sub[o + 4] + sub[o + 6],
          sub[o + 5] + sub[o + 7],
        ].map((v) => v / (subA * 2));
        const mx = Math.max(...qv),
          mn = Math.min(...qv),
          avg = (qv[0] + qv[1] + qv[2] + qv[3]) / 4;
        if (avg < 0.06) out[k] = ' ';
        else if (mx - mn < 0.3)
          out[k] = SHADEBLK[Math.max(0, Math.min(3, Math.round(avg * 4) - 1))];
        else
          out[k] =
            QUAD[
              (qv[0] > 0.35 ? 1 : 0) |
                (qv[1] > 0.35 ? 2 : 0) |
                (qv[2] > 0.35 ? 4 : 0) |
                (qv[3] > 0.35 ? 8 : 0)
            ];
      }
    }
    return { chars: out, colors: gridCol };
  }
  if (mode === 'cjk') {
    // full-width characters take two columns; the second cell holds '' as a continuation
    const r = calibrated(CJK, true, m);
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const k = j * cols + i;
        if (i + 1 >= cols) {
          out[k] = ' ';
          continue;
        }
        const c = pickGlyph(r, Math.min(1, (st[k] + st[k + 1]) / (2 * area)));
        out[k] = c;
        out[k + 1] = c === ' ' ? ' ' : '';
        if (!gridCol[k]) gridCol[k] = gridCol[k + 1];
        i++;
      }
    return { chars: out, colors: gridCol };
  }
  const ramp =
      mode === 'dots'
        ? DOTS_R
        : calibrated(
            mode === 'custom' ? (customRamp.length ? customRamp : ['@']) : Array.from(SHADE),
            false,
            m,
          ),
    fillR = calibrated(Array.from(FILL), false, m);
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i,
        cov = st[k] / area;
      if (mode === 'shade' || mode === 'custom' || mode === 'dots') {
        out[k] = pickGlyph(ramp, Math.min(1, cov));
        continue;
      }
      if (cov < 0.03) {
        out[k] = ' ';
        continue;
      }
      if (cov > 0.6) {
        out[k] = pickGlyph(fillR, Math.min(1, cov));
        continue;
      }
      // aggregate 3x3 neighbourhood moments (centre weighted)
      let A = 0,
        X = 0,
        Y = 0,
        XX = 0,
        YY = 0,
        XY = 0;
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          const ii = i + di,
            jj = j + dj;
          if (ii < 0 || jj < 0 || ii >= cols || jj >= rows) continue;
          const q = jj * cols + ii,
            w = di || dj ? 0.55 : 1;
          A += w * s[q];
          X += w * sx[q];
          Y += w * sy[q];
          XX += w * sxx[q];
          YY += w * syy[q];
          XY += w * sxy[q];
        }
      const mx = X / A,
        my = Y / A,
        cxx = XX / A - mx * mx,
        cyy = YY / A - my * my,
        cxy = XY / A - mx * my;
      const tr = cxx + cyy,
        det = cxx * cyy - cxy * cxy,
        disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
      const l1 = tr / 2 + disc,
        l2 = tr / 2 - disc,
        elong = l1 > 0 ? 1 - l2 / l1 : 0;
      const ocy = (sy[k] / s[k] - j * ch) / ch; // own centroid within cell, 0 top … 1 bottom
      if (elong > 0.55) {
        let th = (0.5 * Math.atan2(2 * cxy, cxx - cyy) * 180) / Math.PI;
        if (th < 0) th += 180;
        if (th < 22 || th > 158) out[k] = ocy > 0.68 ? '_' : ocy < 0.3 ? '`' : '-';
        else if (th > 68 && th < 112) out[k] = '|';
        else out[k] = th < 90 ? '\\' : '/';
      } else {
        if (cov < 0.12) out[k] = ocy > 0.6 ? '.' : ocy < 0.35 ? "'" : '·';
        else out[k] = cov < 0.3 ? '+' : cov < 0.45 ? 'o' : 'O';
      }
    }
  // '·' is not ASCII; fold it back
  for (let k = 0; k < n; k++) if (out[k] === '·') out[k] = '.';
  return { chars: out, colors: gridCol };
}
