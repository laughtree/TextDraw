import type { Candidate } from './blocks';
import { BRAILLE_ZONE_BITS } from './charsets';

/** weight of the whole-cell tone error relative to the per-zone shape error */
export const TONE_WEIGHT = 12;
/** cells with less average ink than this stay blank */
export const BLANK_BELOW = 0.02;
/** a braille dot is only lit where the zone is at least this inked, so faint fringes stay clean */
export const BRAILLE_MIN = 0.25;

function score(g: Candidate, t: number[], tm: number): number {
  let e = 0;
  for (let q = 0; q < 8; q++) {
    const d = g.v[q] - t[q];
    e += d * d;
  }
  const dm = g.m - tm;
  return e + TONE_WEIGHT * dm * dm;
}

/**
 * The candidate whose ink layout is closest to the cell's (`t`: ink per zone, `tm`: its mean).
 * `extra` competes too but only wins when strictly better; earlier set entries win ties.
 */
export function bestMatch(
  t: number[],
  tm: number,
  set: readonly Candidate[],
  extra?: Candidate | null,
): string {
  let best = ' ',
    bd = Infinity;
  for (const g of set) {
    const e = score(g, t, tm);
    if (e < bd) {
      bd = e;
      best = g.c;
    }
  }
  if (extra && score(extra, t, tm) < bd) best = extra.c;
  return best;
}

/**
 * The braille cell that fits `t` best: each dot is lit exactly when that lowers the error in its
 * zone (and the zone is inked enough). `dots[q]` is the measured ink layout of the single dot in
 * zone q. Fills and returns `out`, or returns null when no dot qualifies.
 */
export function brailleCandidate(
  t: number[],
  dots: readonly number[][],
  out: Candidate,
): Candidate | null {
  let bits = 0;
  out.v.fill(0);
  for (let q = 0; q < 8; q++) {
    if (t[q] > Math.max(dots[q][q] / 2, BRAILLE_MIN)) {
      bits |= BRAILLE_ZONE_BITS[q];
      for (let z = 0; z < 8; z++) out.v[z] += dots[q][z];
    }
  }
  if (!bits) return null;
  let sum = 0;
  for (let z = 0; z < 8; z++) {
    out.v[z] = Math.min(1, out.v[z]);
    sum += out.v[z];
  }
  out.m = sum / 8;
  out.c = String.fromCharCode(0x2800 + bits);
  return out;
}
