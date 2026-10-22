import { describe, expect, it } from 'vitest';
import { en } from '../../src/i18n/en';
import { ja } from '../../src/i18n/ja';
import { zhTW } from '../../src/i18n/zh-TW';

const DICTS = { 'zh-TW': zhTW, ja } as const;
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('dictionaries', () => {
  for (const [name, dict] of Object.entries(DICTS)) {
    describe(name, () => {
      it('has exactly the keys of the English one', () => {
        expect(Object.keys(dict).sort()).toEqual(Object.keys(en).sort());
      });

      it('has no empty strings', () => {
        for (const [key, value] of Object.entries(dict)) expect(value.trim(), key).not.toBe('');
      });

      it('uses the same {placeholders} as English for every key', () => {
        for (const key of Object.keys(en) as (keyof typeof en)[])
          expect(placeholders(dict[key]), key).toEqual(placeholders(en[key]));
      });
    });
  }

  it('has no empty English strings', () => {
    for (const [key, value] of Object.entries(en)) expect(value.trim(), key).not.toBe('');
  });

  it('keeps the markup only where the key says there is markup', () => {
    for (const dict of [en, zhTW, ja] as Record<string, string>[])
      for (const [key, value] of Object.entries(dict))
        if (!key.endsWith('.body')) expect(value, key).not.toMatch(/[<>]/);
  });
});
