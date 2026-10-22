import { describe, expect, it } from 'vitest';
import { detectLang, isLang, resolveLang } from '../../src/i18n/lang';

describe('detectLang', () => {
  it('maps every Chinese variant to Traditional Chinese', () => {
    for (const tag of [
      'zh-TW',
      'zh-HK',
      'zh-MO',
      'zh-Hant',
      'zh-Hant-TW',
      'zh-CN',
      'zh-SG',
      'zh-Hans',
      'zh',
    ])
      expect(detectLang([tag]), tag).toBe('zh-TW');
  });

  it('knows Japanese and English, whatever the region and case', () => {
    expect(detectLang(['ja'])).toBe('ja');
    expect(detectLang(['ja-JP'])).toBe('ja');
    expect(detectLang(['JA-jp'])).toBe('ja');
    expect(detectLang(['en-US'])).toBe('en');
    expect(detectLang(['en-GB'])).toBe('en');
  });

  it('falls back to English for anything else', () => {
    for (const tag of ['fr', 'de-DE', 'ko-KR', 'es', 'ar', '', 'x-unknown'])
      expect(detectLang([tag]), tag).toBe('en');
    expect(detectLang([])).toBe('en');
  });

  it('uses the first language the user ranked that is supported', () => {
    expect(detectLang(['fr-FR', 'ja', 'en'])).toBe('ja');
    expect(detectLang(['de', 'zh-TW'])).toBe('zh-TW');
    expect(detectLang(['ja', 'zh-TW'])).toBe('ja');
    expect(detectLang(['ko', 'fr'])).toBe('en');
  });
});

describe('resolveLang', () => {
  const base = { search: '', saved: null, languages: ['ja'] };

  it('prefers ?lang=, then the saved choice, then the browser', () => {
    expect(resolveLang({ ...base, search: '?lang=en', saved: 'zh-TW' })).toBe('en');
    expect(resolveLang({ ...base, saved: 'zh-TW' })).toBe('zh-TW');
    expect(resolveLang(base)).toBe('ja');
    expect(resolveLang({ ...base, languages: [] })).toBe('en');
  });

  it('ignores values that are not a supported language', () => {
    expect(resolveLang({ ...base, search: '?lang=fr', saved: 'zh-TW' })).toBe('zh-TW');
    expect(resolveLang({ ...base, saved: 'klingon' })).toBe('ja');
    expect(resolveLang({ ...base, search: '?other=1&lang=', saved: '' })).toBe('ja');
  });

  it('finds ?lang= among other parameters', () => {
    expect(resolveLang({ ...base, search: '?x=1&lang=zh-TW&y=2' })).toBe('zh-TW');
  });
});

describe('isLang', () => {
  it('accepts exactly the three languages', () => {
    expect(['en', 'zh-TW', 'ja'].every(isLang)).toBe(true);
    expect(['EN', 'zh', 'zh-CN', 'fr', null, undefined, 3].some(isLang)).toBe(false);
  });
});
