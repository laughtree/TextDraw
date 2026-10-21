import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { line, openApp, type App } from './harness';

let app: App;
beforeEach(async () => {
  app = await openApp('/index.html');
  await app.settle();
});
afterEach(() => app.close());

const anims = (sel: string) => app.q(sel).getAnimations().length;
const rowsOf = () => Number(/× (\d+) cells/.exec(app.q('#meta').textContent ?? '')?.[1]);

function choose(id: string): void {
  const select = app.q<HTMLSelectElement>('#platform');
  select.value = id;
  select.dispatchEvent(new app.win.Event('change', { bubbles: true }));
}

describe('enter/exit motion', () => {
  it('plays nothing at start', () => {
    expect(app.animations()).toBe(0);
  });

  it('slides the copy menu open and shut, and cleans up after itself', async () => {
    const menu = app.q('#copyMenu');
    app.click('#bCopy');
    expect(menu.hidden).toBe(false); // visible straight away, then animates in
    expect(anims('#copyMenu')).toBeGreaterThan(0);
    expect(app.q('#bCopy').getAttribute('aria-expanded')).toBe('true');
    await app.settle();
    expect(menu.style.overflow).toBe('');
    expect(menu.style.height).toBe('');
    expect(menu.getBoundingClientRect().height).toBeGreaterThan(50);

    app.click('#bCopy');
    expect(app.q('#bCopy').getAttribute('aria-expanded')).toBe('false');
    expect(menu.hidden).toBe(false); // still on its way out
    expect(anims('#copyMenu')).toBeGreaterThan(0);
    await app.settle();
    expect(menu.hidden).toBe(true);
    expect(menu.style.overflow).toBe('');
  });

  it('survives an open-close double click without sticking half way', async () => {
    app.click('#bCopy');
    app.click('#bCopy');
    await app.settle();
    expect(app.q('#copyMenu').hidden).toBe(true);
    expect(app.q('#bCopy').getAttribute('aria-expanded')).toBe('false');
    expect(app.view.style.width).toBe('');
    expect(app.q('#copyMenu').style.overflow).toBe('');
    // and still opens normally afterwards
    app.click('#bCopy');
    await app.settle();
    expect(app.q('#copyMenu').hidden).toBe(false);
    expect(app.q('#copyMenu').getBoundingClientRect().height).toBeGreaterThan(50);
  });

  it('freezes the canvas while a panel pushes the stage, then re-fits once', async () => {
    const before = app.view.getBoundingClientRect(),
      stageBefore = app.q('#stage').getBoundingClientRect().height,
      rowsBefore = rowsOf();
    let rendered = 0;
    app.doc.addEventListener('rendered', () => rendered++);

    app.click('#bCopy');
    await app.frames(2); // part way through the 200 ms slide
    expect(app.q('#stage').getBoundingClientRect().height).toBeLessThan(stageBefore);
    const mid = app.view.getBoundingClientRect();
    expect(mid.width).toBeCloseTo(before.width, 0);
    expect(mid.height).toBeCloseTo(before.height, 0); // clipped, not squashed
    expect(rendered).toBe(0); // no per-frame re-conversion

    await app.settle();
    expect(app.view.style.width).toBe('');
    expect(app.view.style.height).toBe('');
    expect(rendered).toBeGreaterThanOrEqual(1);
    expect(rendered).toBeLessThanOrEqual(2);
    expect(rowsOf()).toBeLessThan(rowsBefore);
  });

  it('drops the toast in from above and fades it back out', async () => {
    app.click('#bClear');
    const toast = app.q('#toast');
    expect(toast.hidden).toBe(false);
    const [first] = toast.getAnimations();
    const frames = (first.effect as KeyframeEffect).getKeyframes();
    expect(String(frames[0].transform)).toContain('-8px');
    expect(Number(frames[0].opacity)).toBe(0);
    await app.settle();
    expect(getComputedStyle(toast).opacity).toBe('1');

    app.click('#bClear'); // already showing: new text only, no second entrance
    expect(anims('#toast')).toBe(0);

    await app.sleep(1850); // the timer restarted with the second call
    await app.settle();
    expect(toast.hidden).toBe(true);
  });

  it('brings the toast back if it is asked for while fading out', async () => {
    app.click('#bClear');
    await app.sleep(1800 + 60); // the exit has just started
    expect(anims('#toast')).toBeGreaterThan(0);
    app.click('#bClear');
    await app.settle();
    expect(app.q('#toast').hidden).toBe(false);
    expect(getComputedStyle(app.q('#toast')).opacity).toBe('1');
  });

  it('animates the custom-characters row in and out with the mode', async () => {
    const row = app.q('#customRow');
    app.click('[data-mode="custom"]');
    expect(row.hidden).toBe(false);
    expect(anims('#customRow')).toBeGreaterThan(0);
    await app.settle();
    app.click('[data-mode="braille"]');
    expect(row.hidden).toBe(false); // exiting
    await app.settle();
    expect(row.hidden).toBe(true);
  });

  it('animates the canvas-size panel', async () => {
    const panel = app.q('#canvasPanel');
    app.click('#bCanvas');
    expect(panel.hidden).toBe(false);
    expect(anims('#canvasPanel')).toBeGreaterThan(0);
    await app.settle();
    app.click('#bCanvas');
    await app.settle();
    expect(panel.hidden).toBe(true);
  });

  it('slides the help bubble in from below', async () => {
    choose('x');
    await app.settle();
    app.click('#platformTipBtn');
    const [first] = app.q('#platformTip').getAnimations();
    const frames = (first.effect as KeyframeEffect).getKeyframes();
    expect(String(frames[0].transform)).toContain('4px');
    await app.settle();
    expect(app.q('#platformTip').hidden).toBe(false);
  });

  it('fades in the readout and the info button when a platform is chosen', async () => {
    choose('x');
    expect(app.q('#budget').hidden).toBe(false);
    expect(anims('#budget')).toBeGreaterThan(0);
    expect(app.q('#platformTipBtn').hidden).toBe(false);
    expect(anims('#platformTipBtn')).toBeGreaterThan(0);
    await app.settle();
    choose('');
    await app.settle();
    expect(app.q('#budget').hidden).toBe(true);
    expect(app.q('#platformTipBtn').hidden).toBe(true);
    expect(app.q('#canvasBudget').hidden).toBe(true);
  });

  it('fades the manual-copy panel in and out when the clipboard is blocked', async () => {
    Object.defineProperty(app.win.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('blocked')) },
    });
    const v = app.view.getBoundingClientRect();
    app.stroke(line(20, v.height / 2, v.width - 20, v.height / 2, 10));
    app.click('[data-copy="text"]');
    await app.frames(2);
    const panel = app.q('#copyPanel');
    expect(panel.hidden).toBe(false);
    expect(anims('#copyPanel')).toBeGreaterThan(0);
    await app.settle();
    app.click('#bClosePanel');
    expect(panel.hidden).toBe(false);
    await app.settle();
    expect(panel.hidden).toBe(true);
  });
});
