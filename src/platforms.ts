import { LIMITS, type Grid } from './grid';

/** How a platform counts characters toward its limit. */
export type Counter = 'weighted' | 'graphemes' | 'chars';

export interface Platform {
  id: string;
  label: string;
  /** maximum count, in the platform's own unit; null when there is no single verifiable limit */
  limit: number | null;
  counter: Counter;
  /** count of one cell in the worst case (a block / braille cell); X weighs those 2 */
  cellWeight: number;
  /** 'official': limit and rule come from the platform's own documentation; 'estimate': a generic guess */
  source: 'official' | 'thirdparty' | 'estimate';
  /** a fixed suggested size that replaces the one derived from `limit` */
  grid?: Grid;
  /** one line on how the platform counts, shown in the help bubble */
  rule: string;
}

/**
 * Sources (checked 2026-10-21):
 * - X: docs.x.com/fundamentals/counting-characters and twitter-text config/v3.json
 * - Telegram: core.telegram.org/bots/api (sendMessage.text: "1-4096 characters after entities parsing")
 * - Discord: support.discord.com/hc/en-us/articles/33694251638295 (base accounts; Nitro's 4000 not used)
 * - Mastodon: docs.joinmastodon.org/user/posting and /entities/Instance
 * The rest only have third-party sources.
 */
export const PLATFORMS: readonly Platform[] = [
  {
    id: 'chat',
    label: '聊天室',
    limit: null,
    counter: 'chars',
    cellWeight: 1,
    source: 'estimate',
    // chat bubbles are narrower and wrap sooner than posts, so this is smaller than any post preset
    grid: { cols: 24, rows: 12 },
    rule: '聊天泡泡通常比發文更窄、更容易換行，所以尺寸比發文保守；沒有對應的字數上限，不顯示讀數',
  },
  {
    id: 'x',
    label: 'X',
    limit: 280,
    counter: 'weighted',
    cellWeight: 2,
    source: 'official',
    rule: '加權計數：方塊、點字與中文每字算 2，換行與標準空白算 1',
  },
  {
    id: 'telegram',
    label: 'Telegram',
    limit: 4096,
    counter: 'chars',
    cellWeight: 1,
    source: 'official',
    rule: '以字元計（換行是否算 2 未經證實）',
  },
  {
    id: 'discord',
    label: 'Discord',
    limit: 2000,
    counter: 'chars',
    cellWeight: 1,
    source: 'official',
    rule: '以字元計；Nitro 的 4000 未納入',
  },
  {
    id: 'mastodon',
    label: 'Mastodon',
    limit: 500,
    counter: 'chars',
    cellWeight: 1,
    source: 'official',
    rule: '以字元計；500 是預設值，各站可調整',
  },
  {
    id: 'instagram-caption',
    label: 'Instagram 說明',
    limit: 2200,
    counter: 'chars',
    cellWeight: 1,
    source: 'thirdparty',
    rule: '以字元計',
  },
  {
    id: 'instagram-bio',
    label: 'Instagram 簡介',
    limit: 150,
    counter: 'chars',
    cellWeight: 1,
    source: 'thirdparty',
    rule: '以字元計',
  },
  {
    id: 'threads',
    label: 'Threads',
    limit: 500,
    counter: 'chars',
    cellWeight: 1,
    source: 'thirdparty',
    rule: '以字元計',
  },
  {
    id: 'line',
    label: 'LINE',
    limit: 5000,
    counter: 'chars',
    cellWeight: 1,
    source: 'thirdparty',
    rule: '以 UTF-16 單位計（方塊與點字各為 1）',
  },
  {
    id: 'bluesky',
    label: 'Bluesky',
    limit: 300,
    counter: 'graphemes',
    cellWeight: 1,
    source: 'thirdparty',
    rule: '以 grapheme 計；另有 3000 bytes 上限',
  },
];

// twitter-text config v3: these ranges weigh 1 (scale 100), everything else weighs 2
const X_LIGHT: readonly (readonly [number, number])[] = [
  [0, 4351],
  [8192, 8205],
  [8208, 8223],
  [8242, 8247],
];

const xWeight = (cp: number): number => (X_LIGHT.some(([a, b]) => cp >= a && cp <= b) ? 1 : 2);

/** Count `text` the way a platform does. */
export function countOf(text: string, counter: Counter): number {
  if (counter === 'weighted') {
    let n = 0;
    for (const c of text.normalize('NFC')) n += xWeight(c.codePointAt(0) ?? 0);
    return n;
  }
  if (counter === 'graphemes') {
    return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].length;
  }
  return Array.from(text).length;
}

/** Widest preset: 32 columns (an estimate of what chat bubbles and feeds show without wrapping). */
export const PRESET_MAX_ROWS = 16;

/**
 * Largest roughly square grid (cols = 2 × rows, so cells of ~1:2 look square) whose worst case,
 * every cell holding a `cellWeight` character plus a newline per row break, stays within `limit`.
 */
export function deriveGrid(limit: number, cellWeight: number): Grid {
  for (let rows = PRESET_MAX_ROWS; rows >= LIMITS.minRows; rows--) {
    const cols = rows * 2;
    if (cols * rows * cellWeight + (rows - 1) <= limit) return { cols, rows };
  }
  return { cols: LIMITS.minCols, rows: LIMITS.minRows };
}

export const presetGrid = (p: Platform): Grid => p.grid ?? deriveGrid(p.limit ?? 0, p.cellWeight);

export const findPlatform = (id: string | null): Platform | null =>
  PLATFORMS.find((p) => p.id === id) ?? null;
