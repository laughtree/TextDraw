import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { line, openApp, type App } from './harness';

let app: App;
beforeEach(async () => {
  app = await openApp('/index.html');
  await app.frames();
});
afterEach(() => app.close());

const meta = () => app.q('#meta').textContent;
const rect = (sel: string) => app.q(sel).getBoundingClientRect();
const pressed = (sel: string) => app.q(sel).getAttribute('aria-pressed');

/** leave 滿版 and commit an explicit grid */
async function fix(cols: number, rows: number) {
  app.click('#bAuto');
  app.setValue('#inCols', String(cols), 'change');
  app.setValue('#inRows', String(rows), 'change');
  await app.frames();
}

async function copyText() {
  await app.frames();
  app.copied.length = 0;
  app.copy('text');
  return app.copied.join('');
}

describe('canvas size panel', () => {
  it('shows 滿版 while following the window', () => {
    expect(pressed('#bAuto')).toBe('true');
    expect(app.q('#bAuto').textContent).toContain('滿版');
    expect(app.q<HTMLInputElement>('#inCols').disabled).toBe(true);
    expect(app.q('#canvasSummary').textContent).toMatch(/^滿版 · \d+ × \d+$/);
    const p = rect('#paper'),
      s = rect('#stage');
    expect(p.width).toBeCloseTo(s.width, 0);
    expect(p.height).toBeCloseTo(s.height, 0);
    expect(app.q('#stage').classList.contains('fixed')).toBe(false);
  });

  it('shows the real grid in the (disabled) inputs', () => {
    const [, cols, rows] = /(\d+) × (\d+)/.exec(meta()) ?? [];
    expect(app.q<HTMLInputElement>('#inCols').value).toBe(cols);
    expect(app.q<HTMLInputElement>('#inRows').value).toBe(rows);
  });

  it('collapses and expands', () => {
    expect(app.q('#canvasPanel').hidden).toBe(true);
    app.click('#bCanvas');
    expect(app.q('#canvasPanel').hidden).toBe(false);
    expect(app.q('#bCanvas').getAttribute('aria-expanded')).toBe('true');
  });

  it('fixes the grid and fits it, centred, into the stage', async () => {
    await fix(40, 10);
    expect(meta()).toBe('40 × 10 cells');
    expect(app.q('#canvasSummary').textContent).toBe('小尺寸通用 · 40 × 10'); // the platform stays chosen
    expect(app.q<HTMLInputElement>('#inCols').disabled).toBe(false);
    const p = rect('#paper'),
      s = rect('#stage');
    expect(app.q('#stage').classList.contains('fixed')).toBe(true);
    expect(p.width).toBeLessThanOrEqual(s.width);
    expect(p.left - s.left).toBeCloseTo(s.right - p.right, 0);
    expect(p.top - s.top).toBeCloseTo(s.bottom - p.bottom, 0);
    // a cell is roughly 1 : 2.05, so 40 × 10 cells is about 1.95 : 1
    expect(p.width / p.height).toBeGreaterThan(1.8);
    expect(p.width / p.height).toBeLessThan(2.1);
  });

  it('maps pointer positions through the display scale', async () => {
    await fix(40, 10);
    app.click('#bClear'); // drop the starter picture
    app.click('[data-mode="block"]');
    app.setValue('#size', '14');
    const p = app.view.getBoundingClientRect();
    expect(p.width).toBeGreaterThan(40 * 7.8 * 1.2); // the canvas really is scaled up
    // 10 % → 40 % of the width is 12 of the 40 columns (plus the round caps)
    app.stroke(line(p.width * 0.1, p.height / 2, p.width * 0.4, p.height / 2, 20));
    const text = await copyText();
    const widest = Math.max(
      ...text.split('\n').map((l) => [...l].filter((c) => c !== ' ' && c !== '⠀').length),
    );
    expect(widest).toBeGreaterThanOrEqual(11);
    expect(widest).toBeLessThanOrEqual(16);
  });

  it('clamps out-of-range numbers and ignores junk', async () => {
    await fix(40, 10);
    app.setValue('#inCols', '999', 'change');
    app.setValue('#inRows', '999', 'change');
    expect(meta()).toBe('200 × 100 cells');
    app.setValue('#inCols', '3', 'change');
    app.setValue('#inRows', '1', 'change');
    expect(meta()).toBe('8 × 4 cells');
    app.setValue('#inCols', 'abc', 'change'); // a number input sanitises this to ''
    expect(meta()).toBe('8 × 4 cells');
    expect(app.q<HTMLInputElement>('#inCols').value).toBe('8');
  });

  it('keeps the grid when the window is resized, only changing the scale', async () => {
    await fix(40, 10);
    const before = rect('#paper').width;
    app.iframe.style.width = '360px';
    await app.frames(4);
    expect(meta()).toBe('40 × 10 cells');
    expect(rect('#paper').width).toBeLessThan(before);
  });

  it('follows the window again after switching back to auto', async () => {
    await fix(40, 10);
    app.click('#bAuto');
    await app.frames();
    expect(pressed('#bAuto')).toBe('true');
    expect(meta()).not.toBe('40 × 10 cells');
    expect(rect('#paper').width).toBeCloseTo(rect('#stage').width, 0);
  });

  it('keeps the painting through a grid change and can undo and redo it', async () => {
    app.click('[data-mode="block"]');
    app.setValue('#size', '14');
    const v = app.view.getBoundingClientRect();
    app.stroke(line(v.width * 0.2, v.height * 0.3, v.width * 0.8, v.height * 0.3, 20));
    const original = await copyText();
    expect(original.length).toBeGreaterThan(10);
    const autoMeta = meta();

    await fix(40, 10);
    expect(await copyText()).not.toBe(''); // the stroke was stretched along
    expect(meta()).toBe('40 × 10 cells');

    for (let i = 0; i < 6 && pressed('#bAuto') !== 'true'; i++) {
      app.click('#bUndo');
      await app.frames();
    }
    expect(pressed('#bAuto')).toBe('true');
    expect(meta()).toBe(autoMeta);
    expect(await copyText()).toBe(original);

    for (let i = 0; i < 6 && meta() !== '40 × 10 cells'; i++) {
      app.click('#bRedo');
      await app.frames();
    }
    expect(meta()).toBe('40 × 10 cells');
    expect(app.q<HTMLInputElement>('#inCols').value).toBe('40');
  });

  it('draws and renders the largest grid within a sane time', async () => {
    await fix(200, 100);
    expect(meta()).toBe('200 × 100 cells');
    app.setValue('#size', '20');
    const v = app.view.getBoundingClientRect();
    for (let i = 0; i < 6; i++) {
      app.stroke(line(5, (v.height * (i + 1)) / 7, v.width - 5, (v.height * (i + 1)) / 7, 10));
    }
    await app.frames();
    const t0 = app.win.performance.now();
    app.fire('pointerdown', 20, 20);
    app.fire('pointermove', 80, 60);
    app.fire('pointerup', 80, 60);
    await app.frames(1);
    const ms = app.win.performance.now() - t0;
    console.info(`200×100 mix: draw + one frame took ${ms.toFixed(0)} ms`);
    expect(ms).toBeLessThan(500);
  });
});

describe('brush ring with a fixed grid', () => {
  it('scales with the canvas but never below the minimum', async () => {
    app.setValue('#size', '20');
    await fix(40, 10); // small grid → canvas scaled up
    app.fire('pointermove', 50, 30);
    expect(app.q('#brush').getBoundingClientRect().width).toBeGreaterThan(24);
    await fix(200, 100); // big grid → canvas scaled down
    app.fire('pointermove', 50, 30);
    const w = app.q('#brush').getBoundingClientRect().width;
    expect(w).toBeLessThan(20);
    expect(w).toBeGreaterThanOrEqual(6);
  });
});

describe('the first thing a visitor sees', () => {
  let fresh: App;
  beforeEach(async () => {
    app.close(); // the outer hooks opened a full-size page; this one starts as a visitor would see it
    fresh = await openApp('/index.html', 480, 720, { full: false });
    await fresh.win.document.fonts.load('13px "IBM Plex Mono"', 'M');
    await fresh.settle();
  });
  afterEach(() => fresh.close());

  const summary = () => fresh.q('#canvasSummary').textContent;

  it('starts on the small general size, not full window', () => {
    expect(fresh.q('#meta').textContent).toBe('20 × 12 cells');
    expect(summary()).toBe('小尺寸通用 · 20 × 12');
    expect(fresh.q('#bAuto').getAttribute('aria-pressed')).toBe('false');
    expect(fresh.q('#stage').classList.contains('fixed')).toBe(true);
    expect(fresh.q<HTMLSelectElement>('#platform').value).toBe('chat');
    expect(fresh.q('#platformTipBtn').hidden).toBe(false);
    expect(fresh.q('#budget').hidden).toBe(true); // no limit, no readout
  });

  it('starts with nothing to undo and no motion playing', () => {
    expect(fresh.q<HTMLButtonElement>('#bUndo').disabled).toBe(true);
    expect(fresh.animations()).toBe(0);
  });

  it('draws the starter picture inside the 20 × 12 grid', async () => {
    fresh.click('#bCopy');
    await fresh.settle();
    fresh.copied.length = 0;
    fresh.copy('text');
    await fresh.frames(2);
    const rows = fresh.copied.join('').split('\n');
    expect(rows.length).toBeGreaterThan(4);
    expect(rows.length).toBeLessThanOrEqual(12);
    expect(Math.max(...rows.map((r) => r.length))).toBeLessThanOrEqual(20);
  });

  it('names what the size is for, and follows platform, 自訂 and 滿版', async () => {
    const select = fresh.q<HTMLSelectElement>('#platform');
    const choose = async (id: string) => {
      select.value = id;
      select.dispatchEvent(new fresh.win.Event('change', { bubbles: true }));
      await fresh.settle();
    };
    await choose('telegram');
    expect(summary()).toBe('Telegram · 32 × 16');
    await choose('');
    expect(summary()).toBe('自訂 · 32 × 16'); // the size stays, only its purpose changes
    fresh.click('#bAuto');
    await fresh.settle();
    expect(summary()).toMatch(/^滿版 · \d+ × \d+$/);
    fresh.click('#bAuto');
    await fresh.settle();
    expect(summary()).toMatch(/^自訂 · \d+ × \d+$/);
  });
});
