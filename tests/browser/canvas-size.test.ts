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

/** leave auto mode and commit an explicit grid */
async function fix(cols: number, rows: number) {
  app.click('#bAuto');
  app.setValue('#inCols', String(cols), 'change');
  app.setValue('#inRows', String(rows), 'change');
  await app.frames();
}

async function copyText() {
  await app.frames();
  app.copied.length = 0;
  app.click('[data-copy="text"]');
  return app.copied.join('');
}

describe('canvas size panel', () => {
  it('starts in auto mode, following the window', () => {
    expect(pressed('#bAuto')).toBe('true');
    expect(app.q<HTMLInputElement>('#inCols').disabled).toBe(true);
    expect(app.q('#canvasSummary').textContent).toMatch(/^自動 · \d+ × \d+$/);
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
    expect(app.q('#canvasSummary').textContent).toBe('40 × 10');
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
