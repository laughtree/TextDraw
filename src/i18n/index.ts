import { en, type Key } from './en';
import { HTML_LANG, isLang, resolveLang, type Lang } from './lang';
import { ja } from './ja';
import { zhTW } from './zh-TW';

export type { Key } from './en';
export { LANGS, type Lang } from './lang';

const DICTS: Record<Lang, Record<Key, string>> = { en, 'zh-TW': zhTW, ja };
const STORAGE_KEY = 'text-draw.lang';

let current: Lang = 'en';

export const getLang = (): Lang => current;

/** The string for `key` in the current language, with `{name}` placeholders filled from `params`. */
export function t(key: Key, params?: Record<string, string | number>): string {
  const raw = DICTS[current][key] || en[key]; // an empty string falls back to English
  return params ? raw.replace(/\{(\w+)\}/g, (m, name: string) => String(params[name] ?? m)) : raw;
}

/**
 * Write the current language into the static markup: `data-i18n` sets the text,
 * `data-i18n-html` the markup (the dictionaries are ours, so this is safe) and
 * `data-i18n-attr="title:key;aria-label:key"` sets attributes.
 */
export function applyStatic(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n as Key);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach((el) => {
    el.innerHTML = t(el.dataset.i18nHtml as Key);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-attr]').forEach((el) => {
    for (const pair of (el.dataset.i18nAttr ?? '').split(';')) {
      const [attr, key] = pair.split(':');
      if (attr && key) el.setAttribute(attr.trim(), t(key.trim() as Key));
    }
  });
}

function read(storage: () => string | null): string | null {
  try {
    return storage();
  } catch {
    return null; // storage can be blocked
  }
}

/** Switch the interface language; `save` remembers the choice for the next visit. */
export function setLang(lang: Lang, save = false): void {
  current = lang;
  document.documentElement.lang = HTML_LANG[lang];
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('app.description'));
  applyStatic();
  const select = document.getElementById('lang') as HTMLSelectElement | null;
  if (select) select.value = lang;
  if (save) read(() => (localStorage.setItem(STORAGE_KEY, lang), null));
  document.dispatchEvent(new Event('langchange'));
}

/** Pick the starting language (URL, then saved choice, then the browser) and wire the switcher. */
export function initI18n(): void {
  const lang = resolveLang({
    search: location.search,
    saved: read(() => localStorage.getItem(STORAGE_KEY)),
    languages: navigator.languages?.length ? navigator.languages : [navigator.language],
  });
  const select = document.getElementById('lang') as HTMLSelectElement | null;
  if (select)
    select.onchange = () => {
      if (isLang(select.value)) setLang(select.value, true);
    };
  setLang(lang);
}
