import { afterEach, describe, expect, it } from 'vitest';
import { en, type Key } from '../../src/i18n/en';
import { ja } from '../../src/i18n/ja';
import { zhTW } from '../../src/i18n/zh-TW';
import { openApp, type App } from './harness';

const DICTS: Record<string, Record<Key, string>> = { en, 'zh-TW': zhTW, ja };
const HTML_LANG: Record<string, string> = { en: 'en', 'zh-TW': 'zh-Hant', ja: 'ja' };
const STORAGE_KEY = 'text-draw.lang';

let app: App | undefined;
afterEach(() => {
  app?.close();
  app = undefined;
  localStorage.removeItem(STORAGE_KEY);
});

const squash = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
/** the dictionary's markup, as the browser would normalise it */
const html = (s: string) => {
  const el = document.createElement('div');
  el.innerHTML = s;
  return squash(el.innerHTML);
};

async function open(lang: string, query = ''): Promise<App> {
  app?.close();
  app = await openApp(`/index.html${query}`, 480, 720, { lang, full: false });
  await app.settle();
  return app;
}

/** every key the static markup refers to, with the element that carries it */
function bindings(root: ParentNode) {
  const out: { el: Element; kind: 'text' | 'html' | 'attr'; key: Key; attr?: string }[] = [];
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    out.push({ el, kind: 'text', key: el.getAttribute('data-i18n') as Key });
  });
  root.querySelectorAll('[data-i18n-html]').forEach((el) => {
    out.push({ el, kind: 'html', key: el.getAttribute('data-i18n-html') as Key });
  });
  root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    for (const pair of (el.getAttribute('data-i18n-attr') ?? '').split(';')) {
      const [attr, key] = pair.split(':');
      out.push({ el, kind: 'attr', attr, key: key as Key });
    }
  });
  return out;
}

describe('the markup written in the HTML file', () => {
  it('is English, and every key it uses exists in all three languages', async () => {
    const raw = await (await fetch('/index.html')).text();
    const page = new DOMParser().parseFromString(raw, 'text/html');
    const found = bindings(page);
    expect(found.length).toBeGreaterThan(60);
    for (const { el, kind, key, attr } of found) {
      for (const dict of Object.values(DICTS)) expect(dict[key], key).toBeTruthy();
      if (kind === 'text') expect(squash(el.textContent), key).toBe(squash(en[key]));
      else if (kind === 'html') expect(squash(el.innerHTML), key).toBe(html(en[key]));
      else expect(el.getAttribute(attr ?? ''), `${key} (${attr})`).toBe(en[key]);
    }
    expect(page.documentElement.lang).toBe('en');
  });
});

describe('each language', () => {
  for (const lang of Object.keys(DICTS)) {
    it(`${lang}: fills in every static string and sets the page language`, async () => {
      const a = await open(lang);
      const dict = DICTS[lang];
      for (const { el, kind, key, attr } of bindings(a.doc)) {
        if (kind === 'text') expect(squash(el.textContent), key).toBe(squash(dict[key]));
        else if (kind === 'html') expect(squash(el.innerHTML), key).toBe(html(dict[key]));
        else expect(el.getAttribute(attr ?? ''), `${key} (${attr})`).toBe(dict[key]);
      }
      expect(a.doc.documentElement.lang).toBe(HTML_LANG[lang]);
      expect(a.doc.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
        dict['app.description'],
      );
      expect(a.q<HTMLSelectElement>('#lang').value).toBe(lang);
      expect(a.q('#meta').textContent).toBe(
        dict['meta.cells'].replace('{cols}', '20').replace('{rows}', '12'),
      );
      expect(a.doc.title).toBe('Text Draw');
    });

    it(`${lang}: messages and the menu buttons use it`, async () => {
      const a = await open(lang);
      const dict = DICTS[lang];
      a.click('#bClear');
      expect(a.q('#toast').textContent).toBe(dict['toast.cleared']);
      a.click('#bCopy');
      expect(a.q('#bCopy').textContent?.trim()).toBe(dict['action.cancel']);
      expect(a.q('#bImport').textContent?.trim()).toBe(dict['action.import']);
      a.click('#bCopy');
      expect(a.q('#bCopy').textContent?.trim()).toBe(dict['action.export']);
    });
  }

  it('falls back to English for a language it does not have', async () => {
    const a = await open('fr');
    expect(a.q<HTMLSelectElement>('#lang').value).not.toBe('fr');
    // an invalid ?lang= is ignored, so the browser's own languages decide (English in the test browser)
    expect(a.doc.documentElement.lang).toBe(HTML_LANG[a.q<HTMLSelectElement>('#lang').value]);
  });
});

describe('the language switcher', () => {
  const choose = async (a: App, lang: string) => {
    const select = a.q<HTMLSelectElement>('#lang');
    select.value = lang;
    select.dispatchEvent(new a.win.Event('change', { bubbles: true }));
    await a.settle();
  };

  it('offers the three languages by their own names', async () => {
    const a = await open('en');
    const options = [...a.q<HTMLSelectElement>('#lang').options].map((o) => [
      o.value,
      o.textContent,
    ]);
    expect(options).toEqual([
      ['en', 'English'],
      ['zh-TW', '繁體中文'],
      ['ja', '日本語'],
    ]);
  });

  it('changes static and dynamic text at once', async () => {
    const a = await open('en');
    expect(a.q('#bClear').textContent?.trim()).toBe('Clear');
    expect(a.q('#canvasSummary').textContent).toBe('Small general size · 20 × 12');
    await choose(a, 'ja');
    expect(a.q('#bClear').textContent?.trim()).toBe(ja['action.clear']);
    expect(a.q('#canvasSummary').textContent).toBe('小サイズ（汎用） · 20 × 12');
    expect(a.q('#meta').textContent).toBe('20 × 12 セル');
    expect([...a.q<HTMLSelectElement>('#platform').options].map((o) => o.textContent)).toContain(
      '小サイズ（汎用） · 20 × 12',
    );
    expect(a.doc.documentElement.lang).toBe('ja');
    await choose(a, 'zh-TW');
    expect(a.q('#canvasSummary').textContent).toBe('小尺寸通用 · 20 × 12');
    expect(a.q('#platformTip').textContent).toContain('資料來源');
    await choose(a, 'en');
    expect(a.q('#platformTip').textContent).toContain('Suggested size');
  });

  it('keeps the menu button labels right across a switch', async () => {
    const a = await open('en');
    a.click('#bImport');
    await a.settle();
    expect(a.q('#bImport').textContent?.trim()).toBe('Cancel');
    await choose(a, 'ja');
    expect(a.q('#bImport').textContent?.trim()).toBe(ja['action.cancel']);
    expect(a.q('#bCopy').textContent?.trim()).toBe(ja['action.export']);
    expect(a.q('#bImport').getAttribute('aria-expanded')).toBe('true');
  });

  it('re-writes the used / limit readout and the help bubble', async () => {
    const a = await open('en');
    const select = a.q<HTMLSelectElement>('#platform');
    select.value = 'x';
    select.dispatchEvent(new a.win.Event('change', { bubbles: true }));
    await a.settle();
    expect(a.q('#budgetCount').textContent).toMatch(/^Used \d+ \/ 280/);
    await choose(a, 'zh-TW');
    expect(a.q('#budgetCount').textContent).toMatch(/^已用 \d+ \/ 280/);
    await choose(a, 'ja');
    expect(a.q('#budgetCount').textContent).toMatch(/^使用 \d+ \/ 280/);
    expect(a.q('#platformTip').textContent).toContain('加重カウント');
  });

  it('remembers the choice for the next visit, and ?lang= still wins', async () => {
    const a = await open('en');
    await choose(a, 'ja');
    expect(a.win.localStorage.getItem(STORAGE_KEY)).toBe('ja');
    // a fresh load without ?lang= uses what was saved
    const b = await openApp('/index.html', 480, 720, { lang: '', full: false });
    app = b;
    expect(b.doc.documentElement.lang).toBe('ja');
    // an explicit ?lang= beats it
    const c = await open('zh-TW');
    expect(c.doc.documentElement.lang).toBe('zh-Hant');
  });
});
