import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { countOf, findPlatform } from '../../src/platforms';
import { line, openApp, type App } from './harness';

let app: App;
beforeEach(async () => {
  app = await openApp('/index.html');
  await app.frames();
});
afterEach(() => app.close());

const meta = () => app.q('#meta').textContent;
const budget = () => app.q('#budgetCount').textContent ?? '';
const select = () => app.q<HTMLSelectElement>('#platform');

async function choose(id: string) {
  select().value = id;
  select().dispatchEvent(new app.win.Event('change', { bubbles: true }));
  await app.frames();
}

/** a thick stroke from edge to edge on every row, so the grid is (nearly) fully inked */
async function fill() {
  app.click('[data-mode="block"]');
  app.setValue('#size', '40');
  const v = app.view.getBoundingClientRect();
  for (let i = 0; i <= 12; i++) {
    app.stroke(line(0, (v.height * i) / 12, v.width, (v.height * i) / 12, 8));
  }
  await app.frames(2);
}

/** one diagonal stroke: the output's bounding box then contains plenty of blank cells */
async function diagonal() {
  app.click('[data-mode="block"]');
  app.setValue('#size', '10');
  const v = app.view.getBoundingClientRect();
  app.stroke(line(5, 5, v.width - 5, v.height - 5, 20));
  await app.frames(2);
}

async function copyText() {
  app.copied.length = 0;
  app.click('#bCopy');
  app.click('[data-copy="text"]');
  await app.frames();
  return app.copied.join('');
}

describe('platform drop-down', () => {
  it('offers a custom entry plus an official and a third-party group', () => {
    expect(select().value).toBe('');
    const groups = [...select().querySelectorAll('optgroup')].map((g) => g.label);
    expect(groups).toEqual(['官方文件已確認', '第三方來源（未經官方確認）']);
    const labels = [...select().options].map((o) => o.textContent);
    expect(labels).toContain('X · 16 × 8');
    expect(labels).toContain('Telegram · 32 × 16');
    expect(app.q('#budget').hidden).toBe(true);
  });

  it('applies the suggested grid, leaves auto mode, and can be undone', async () => {
    const before = meta();
    await choose('telegram');
    expect(meta()).toBe('32 × 16 cells');
    expect(app.q('#bAuto').getAttribute('aria-pressed')).toBe('false');
    expect(app.q<HTMLInputElement>('#inCols').disabled).toBe(false);
    expect(app.q('#budget').hidden).toBe(false);
    app.click('#bUndo');
    await app.frames();
    expect(meta()).toBe(before);
  });

  it('shows X usage by weight and follows the space substitute', async () => {
    await choose('x');
    expect(meta()).toBe('16 × 8 cells');
    await diagonal();
    const x = findPlatform('x');
    if (!x) throw new Error('x missing');
    const used = countOf(await copyText(), x.counter);
    expect(used).toBeGreaterThan(40);
    expect(budget()).toContain(`已用 ${used} / 280`);

    app.click('[data-space=" "]'); // weight 1 instead of 2 for blank cells
    await app.frames();
    const lighter = countOf(await copyText(), x.counter);
    expect(lighter).toBeLessThan(used);
    expect(budget()).toContain(`已用 ${lighter} / 280`);
  });

  it('keeps the target when the grid is changed by hand, and clears it on "custom"', async () => {
    await choose('discord');
    app.setValue('#inCols', '60', 'change');
    await app.frames();
    expect(select().value).toBe('discord');
    expect(budget()).toContain('/ 2000');
    await choose('');
    expect(app.q('#budget').hidden).toBe(true);
    expect(app.q('#canvasBudget').hidden).toBe(true);
  });

  it('flags an over-limit output and says so when copying', async () => {
    await choose('instagram-bio'); // 150 characters
    app.setValue('#inCols', '100', 'change');
    app.setValue('#inRows', '50', 'change');
    await app.frames();
    await fill();
    const text = await copyText();
    expect(text.length).toBeGreaterThan(150);
    expect(budget()).toContain('超出上限');
    expect(app.q('#budget').classList.contains('over')).toBe(true);
    expect(app.q('#toast').textContent).toMatch(
      /^已複製純文字，但超過 Instagram 簡介 上限（\d+ \/ 150）$/,
    );
    expect(text).not.toBe(''); // the text was still copied
  });

  it('shows a compact readout while the panel is collapsed', async () => {
    await choose('mastodon');
    expect(app.q('#canvasPanel').hidden).toBe(true);
    expect(app.q('#canvasBudget').hidden).toBe(false);
    expect(app.q('#canvasBudget').textContent).toMatch(/^ · \d+\/500$/);
  });

  it('does not warn when copying within the limit', async () => {
    await choose('telegram');
    await fill();
    await copyText();
    expect(app.q('#toast').textContent).toBe('已複製純文字');
  });
});
