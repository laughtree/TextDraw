import { describe, expect, it } from 'vitest';
import { LIMITS } from '../../src/grid';
import { countOf, deriveGrid, findPlatform, PLATFORMS, presetGrid } from '../../src/platforms';

describe('countOf', () => {
  it('weighs X characters by twitter-text ranges', () => {
    expect(countOf('abc', 'weighted')).toBe(3);
    expect(countOf(' ', 'weighted')).toBe(1);
    expect(countOf('\n', 'weighted')).toBe(1);
    expect(countOf('é', 'weighted')).toBe(1);
    expect(countOf('█', 'weighted')).toBe(2);
    expect(countOf('⠀', 'weighted')).toBe(2); // braille blank
    expect(countOf('字', 'weighted')).toBe(2);
    expect(countOf(' ', 'weighted')).toBe(1); // no-break space
  });

  it('normalises to NFC first, so e + combining acute is one light character', () => {
    expect(countOf('é', 'weighted')).toBe(1);
  });

  it('counts graphemes the way Bluesky does', () => {
    expect(countOf('é', 'graphemes')).toBe(1);
    expect(countOf('👨‍👩‍👧', 'graphemes')).toBe(1);
    expect(countOf('█⠀', 'graphemes')).toBe(2);
  });

  it('counts plain characters by code point', () => {
    expect(countOf('█⠀', 'chars')).toBe(2);
    expect(countOf('a\n', 'chars')).toBe(2);
    expect(countOf('😀', 'chars')).toBe(1);
  });
});

describe('deriveGrid', () => {
  const sizeOf = (id: string) => {
    const p = findPlatform(id);
    if (!p) throw new Error(id);
    const { cols, rows } = presetGrid(p);
    return `${cols}x${rows}`;
  };

  it('gives each platform the planned size', () => {
    expect(sizeOf('chat')).toBe('24x12');
    expect(sizeOf('x')).toBe('16x8');
    expect(sizeOf('mastodon')).toBe('30x15');
    expect(sizeOf('threads')).toBe('30x15');
    expect(sizeOf('bluesky')).toBe('24x12');
    expect(sizeOf('instagram-bio')).toBe('16x8');
    for (const id of ['telegram', 'discord', 'line', 'instagram-caption']) {
      expect(sizeOf(id), id).toBe('32x16');
    }
  });

  it('makes the chat room narrower than the presets that are not limited by their character budget', () => {
    const chat = findPlatform('chat');
    if (!chat) throw new Error('chat missing');
    const ids = ['telegram', 'discord', 'line', 'instagram-caption', 'mastodon', 'threads'];
    for (const id of ids) {
      const p = findPlatform(id);
      if (!p) throw new Error(id);
      expect(presetGrid(chat).cols, id).toBeLessThan(presetGrid(p).cols);
    }
  });

  it('never exceeds 32 columns, even for a huge budget', () => {
    expect(deriveGrid(1e9, 1)).toEqual({ cols: 32, rows: 16 });
  });

  it('falls back to the smallest grid for a tiny budget', () => {
    expect(deriveGrid(1, 1)).toEqual({ cols: LIMITS.minCols, rows: LIMITS.minRows });
  });

  it('keeps cells roughly square: columns are twice the rows', () => {
    for (const p of PLATFORMS) {
      const g = presetGrid(p);
      expect(g.cols, p.id).toBe(g.rows * 2);
    }
  });
});

const CHAT_LIMITS = PLATFORMS.filter((p) => ['telegram', 'discord', 'line'].includes(p.id)).map(
  (p) => p.limit ?? Infinity,
);

describe('presets stay within every platform limit, worst case', () => {
  for (const p of PLATFORMS) {
    it(`${p.label}: a fully inked preset still fits`, () => {
      const { cols, rows } = presetGrid(p);
      const worst = Array.from({ length: rows }, () => '█'.repeat(cols)).join('\n');
      // the chat room has no verifiable limit of its own: it must fit under every named chat app
      const limit = p.limit ?? Math.min(...CHAT_LIMITS);
      expect(countOf(worst, p.counter)).toBeLessThanOrEqual(limit);
      expect(cols).toBeLessThanOrEqual(32);
      expect(cols).toBeGreaterThanOrEqual(LIMITS.minCols);
      expect(rows).toBeGreaterThanOrEqual(LIMITS.minRows);
      expect(rows).toBeLessThanOrEqual(LIMITS.maxRows);
    });
  }

  it('marks the chat room as a generic estimate without a limit', () => {
    const chat = findPlatform('chat');
    expect(chat?.limit).toBeNull();
    expect(chat?.source).toBe('estimate');
    expect(PLATFORMS[0].id).toBe('chat');
  });

  it('lists official platforms and flags the rest as third-party', () => {
    const official = PLATFORMS.filter((p) => p.source === 'official').map((p) => p.id);
    expect(official).toEqual(['x', 'telegram', 'discord', 'mastodon']);
    expect(new Set(PLATFORMS.map((p) => p.id)).size).toBe(PLATFORMS.length);
  });
});
