import { afterEach, describe, expect, it } from 'vitest';
import { openApp, type App } from './harness';

let app: App | undefined;
afterEach(() => app?.close());

const LANGS = ['zh-TW', 'en', 'ja'];

async function open(w: number, h: number, full = true, lang = 'zh-TW'): Promise<App> {
  app?.close();
  app = await openApp('/index.html', w, h, { full, lang });
  await app.settle();
  return app;
}

const SIZES: [number, number][] = [
  [320, 568],
  [360, 640],
  [375, 667],
  [390, 844],
  [412, 915],
  [430, 932],
  [768, 1024],
  [1024, 768],
  [1366, 768],
  [667, 375],
  [844, 390],
  [915, 412],
  [1280, 600],
];

const tray = (a: App) => a.q('#tray');
const handle = (a: App) => a.q('#sheetHandle');
const height = (el: Element) => el.getBoundingClientRect().height;
const meta = (a: App) => a.q('#meta').textContent;

describe('common screen sizes', () => {
  for (const lang of LANGS)
    for (const [w, h] of SIZES) {
      // English and Japanese labels are longer than the Chinese ones: they must fit too, with the
      // text tool selected (its extra row) and the export panel open (the widest content)
      it(`${lang} ${w} × ${h}: nothing overflows sideways`, async () => {
        const a = await open(w, h, true, lang);
        a.click('[data-tool="text"]');
        a.click('#bCopy');
        await a.settle();
        const root = a.doc.documentElement;
        expect(root.scrollWidth, 'page').toBeLessThanOrEqual(a.win.innerWidth);
        for (const el of a.doc.querySelectorAll<HTMLElement>(
          '.shell, .tray, .tray .row, .tray .seg, .tray .field',
        )) {
          if (el.clientWidth === 0) continue;
          expect(el.scrollWidth, el.className).toBeLessThanOrEqual(el.clientWidth + 1);
        }
        for (const b of a.doc.querySelectorAll<HTMLElement>('.tray button')) {
          if (b.getClientRects().length === 0) continue;
          expect(b.getBoundingClientRect().right, b.id || b.textContent || '').toBeLessThanOrEqual(
            a.win.innerWidth + 1,
          );
        }
      });
    }

  for (const [w, h] of SIZES) {
    it(`${w} × ${h}: the canvas keeps a usable height`, async () => {
      const a = await open(w, h);
      expect(height(a.q('#stage'))).toBeGreaterThanOrEqual(150);
    });
  }
});

describe('bottom sheet', () => {
  it('is on exactly below 700 px of height', async () => {
    let a = await open(400, 699);
    expect(tray(a).dataset.sheet).toBe('closed');
    expect(a.win.getComputedStyle(handle(a)).display).not.toBe('none');
    a = await open(400, 700);
    expect(tray(a).dataset.sheet).toBeUndefined();
    expect(a.win.getComputedStyle(handle(a)).display).toBe('none');
    expect(a.win.getComputedStyle(tray(a)).position).not.toBe('fixed');
  });

  it('collapsed: handle and the two main rows only, canvas above it', async () => {
    const a = await open(375, 667);
    const t = tray(a).getBoundingClientRect(),
      stage = a.q('#stage').getBoundingClientRect();
    expect(stage.bottom).toBeLessThanOrEqual(t.top + 1);
    expect(t.bottom).toBeCloseTo(a.win.innerHeight, 0);
    for (const sel of ['#sheetHandle', '.toprow', '.tools']) {
      const r = a.q(sel).getBoundingClientRect();
      expect(r.top, sel).toBeGreaterThanOrEqual(t.top - 1);
      expect(r.bottom, sel).toBeLessThanOrEqual(t.bottom + 1);
    }
    for (const sel of ['.colorrow', '#bCopy', '#bImport']) {
      expect(a.win.getComputedStyle(a.q(sel)).visibility, sel).toBe('hidden');
    }
    expect(handle(a).getAttribute('aria-expanded')).toBe('false');
  });

  it('opens and closes with the handle, keeping the canvas size', async () => {
    const a = await open(375, 667);
    const closed = height(tray(a)),
      cells = meta(a);
    handle(a).click();
    expect(handle(a).getAttribute('aria-expanded')).toBe('true');
    await a.settle();
    expect(height(tray(a))).toBeGreaterThan(closed + 100);
    expect(height(tray(a))).toBeLessThanOrEqual(a.win.innerHeight * 0.85 + 1);
    expect(a.win.getComputedStyle(a.q('#bCopy')).visibility).toBe('visible');
    expect(meta(a)).toBe(cells);
    handle(a).click();
    await a.settle();
    expect(handle(a).getAttribute('aria-expanded')).toBe('false');
    expect(height(tray(a))).toBeCloseTo(closed, 0);
    expect(a.win.getComputedStyle(a.q('#bCopy')).visibility).toBe('hidden');
  });

  it('scrolls inside when it is taller than 85 % of a very short screen', async () => {
    const a = await open(667, 375);
    handle(a).click();
    await a.settle();
    expect(height(tray(a))).toBeLessThanOrEqual(a.win.innerHeight * 0.85 + 1);
    expect(tray(a).scrollHeight).toBeGreaterThan(tray(a).clientHeight);
    expect(a.win.getComputedStyle(tray(a)).overflowY).toBe('auto');
  });

  it('closes on Escape, and on a swipe down; opens on a swipe up', async () => {
    const a = await open(375, 667);
    const expanded = () => handle(a).getAttribute('aria-expanded') === 'true';
    handle(a).click();
    await a.settle();
    a.doc.dispatchEvent(new a.win.KeyboardEvent('keydown', { key: 'Escape' }));
    await a.settle();
    expect(expanded()).toBe(false);
    const swipe = (dy: number) => {
      const at = (type: string, y: number) =>
        handle(a).dispatchEvent(
          new a.win.PointerEvent(type, { clientX: 100, clientY: y, pointerId: 7, bubbles: true }),
        );
      at('pointerdown', 300);
      at('pointermove', 300 + dy);
      at('pointerup', 300 + dy);
    };
    swipe(-40);
    await a.settle();
    expect(expanded()).toBe(true);
    swipe(10); // too short to count
    expect(expanded()).toBe(true);
    swipe(40);
    await a.settle();
    expect(expanded()).toBe(false);
  });

  it('a tap on the canvas closes it without drawing', async () => {
    const a = await open(375, 667, false); // a clean history: nothing to undo yet
    handle(a).click();
    await a.settle();
    a.stroke([
      [40, 40],
      [120, 80],
    ]);
    await a.settle();
    expect(handle(a).getAttribute('aria-expanded')).toBe('false');
    expect(a.q<HTMLButtonElement>('#bUndo').disabled).toBe(true); // nothing was drawn
    a.stroke([
      [40, 40],
      [120, 80],
    ]);
    await a.frames(2);
    expect(a.q<HTMLButtonElement>('#bUndo').disabled).toBe(false); // closed: drawing works again
  });

  it('panels open inside the sheet without resizing the canvas', async () => {
    const a = await open(375, 667);
    const cells = meta(a);
    handle(a).click();
    await a.settle();
    a.click('#bCopy');
    await a.settle();
    expect(a.q('#copyMenu').hidden).toBe(false);
    expect(meta(a)).toBe(cells);
    a.click('#bImport');
    await a.settle();
    expect(meta(a)).toBe(cells);
    expect(height(tray(a))).toBeLessThanOrEqual(a.win.innerHeight * 0.85 + 1);
  });

  it('turns back into the normal tray when the window gets taller', async () => {
    const a = await open(375, 667);
    handle(a).click();
    await a.settle();
    a.iframe.style.height = '800px';
    await a.sleep(100);
    await a.settle();
    expect(tray(a).dataset.sheet).toBeUndefined();
    expect(a.win.getComputedStyle(tray(a)).position).not.toBe('fixed');
    expect(a.win.getComputedStyle(a.q('.colorrow')).visibility).toBe('visible');
    a.iframe.style.height = '600px';
    await a.sleep(100);
    await a.settle();
    expect(tray(a).dataset.sheet).toBe('closed');
  });
});
