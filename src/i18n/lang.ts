/** The languages the interface is written in. Anything else falls back to English. */
export type Lang = 'en' | 'zh-TW' | 'ja';

export const LANGS: readonly { id: Lang; name: string }[] = [
  { id: 'en', name: 'English' },
  { id: 'zh-TW', name: '繁體中文' },
  { id: 'ja', name: '日本語' },
];

/** The value for `<html lang>`. */
export const HTML_LANG: Record<Lang, string> = { en: 'en', 'zh-TW': 'zh-Hant', ja: 'ja' };

export const isLang = (v: unknown): v is Lang => LANGS.some((l) => l.id === v);

/** Map one language tag (`ja-JP`, `zh-Hans-CN`, `EN`) to a supported language, or null. */
function fromTag(tag: string): Lang | null {
  const primary = tag.toLowerCase().split('-')[0];
  // every Chinese variant shows the Traditional Chinese interface (it is the only Chinese one)
  if (primary === 'zh') return 'zh-TW';
  if (primary === 'ja') return 'ja';
  if (primary === 'en') return 'en';
  return null;
}

/** The first supported language among the browser's preferred ones, in the order the user ranked them. */
export function detectLang(languages: readonly string[]): Lang {
  for (const tag of languages) {
    const lang = fromTag(tag);
    if (lang) return lang;
  }
  return 'en';
}

export interface LangSources {
  /** `location.search` */
  search: string;
  /** what was saved in a previous visit */
  saved: string | null;
  /** `navigator.languages` */
  languages: readonly string[];
}

/** `?lang=` beats the saved choice, which beats the browser's languages; invalid values are ignored. */
export function resolveLang({ search, saved, languages }: LangSources): Lang {
  const fromUrl = new URLSearchParams(search).get('lang');
  if (isLang(fromUrl)) return fromUrl;
  if (isLang(saved)) return saved;
  return detectLang(languages);
}
