import { describe, expect, it } from 'vitest';
import { BLOCK_SET, type Candidate } from '../../src/blocks';
import { BRAILLE_MIN, bestMatch, brailleCandidate } from '../../src/match';

const scratch = (): Candidate => ({ c: ' ', v: new Array<number>(8).fill(0), m: 0 });
const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;

// a dot that inks only its own zone, at 0.3
const dots = Array.from({ length: 8 }, (_, q) => {
  const v = new Array<number>(8).fill(0);
  v[q] = 0.3;
  return v;
});

describe('bestMatch', () => {
  it('picks every block when shown its own ink layout', () => {
    for (const g of BLOCK_SET) expect(bestMatch(g.v, g.m, BLOCK_SET), g.c).toBe(g.c);
  });

  it('picks blank for no ink and a solid block for full ink', () => {
    expect(bestMatch(new Array<number>(8).fill(0), 0, BLOCK_SET)).toBe(' ');
    expect(bestMatch(new Array<number>(8).fill(1), 1, BLOCK_SET)).toBe('█');
  });

  it('sees a thin bar at the bottom as an eighth block', () => {
    const t = [0, 0, 0, 0, 0, 0, 0.5, 0.5];
    expect(bestMatch(t, mean(t), BLOCK_SET)).toBe('▁');
  });

  it('lets the extra candidate win only when strictly better', () => {
    const t = [0.3, 0, 0, 0, 0, 0, 0, 0];
    const extra: Candidate = { c: '⠁', v: [...t], m: mean(t) };
    expect(bestMatch(t, mean(t), BLOCK_SET, extra)).toBe('⠁');
    const same = BLOCK_SET[1]; // exact copy of an existing entry never displaces it
    expect(bestMatch(same.v, same.m, BLOCK_SET, { ...same, c: 'x' })).toBe(same.c);
  });
});

describe('brailleCandidate', () => {
  it('lights the dots whose zones are inked', () => {
    const t = [0.9, 0, 0, 0, 0, 0, 0, 0.9];
    const out = brailleCandidate(t, dots, scratch());
    expect(out?.c).toBe('⢁'); // dot 1 + dot 8
    expect(out?.v[0]).toBeCloseTo(0.3);
    expect(out?.v[7]).toBeCloseTo(0.3);
    expect(out?.m).toBeCloseTo(0.075);
  });

  it('leaves faint zones dark', () => {
    expect(
      brailleCandidate(new Array<number>(8).fill(BRAILLE_MIN - 0.01), dots, scratch()),
    ).toBeNull();
    expect(brailleCandidate(new Array<number>(8).fill(0), dots, scratch())).toBeNull();
  });

  it('is chosen over blank for a thin, light line', () => {
    const t = [0, 0, 0.5, 0.5, 0, 0, 0, 0];
    const dot = brailleCandidate(t, dots, scratch());
    expect(dot).not.toBeNull();
    expect(bestMatch(t, mean(t), BLOCK_SET, dot)).toBe(dot?.c);
  });
});
