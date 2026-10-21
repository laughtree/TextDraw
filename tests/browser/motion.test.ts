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

async function until(cond: () => boolean, ms = 3000) {
  for (let t = 0; t < ms && !cond(); t += 25) await app.sleep(25);
  expect(cond(), 'condition met in time').toBe(true);
}

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

  it('keeps the canvas, its grid and the painting when a panel opens over it', async () => {
    app.click('#bClear');
    app.click('[data-mode="block"]');
    app.setValue('#size', '10');
    const v = app.view.getBoundingClientRect();
    // a stroke near the bottom, where an opening panel would otherwise crop it away
    app.stroke(line(v.width * 0.1, v.height * 0.92, v.width * 0.9, v.height * 0.92, 12));
    await app.settle();
    const before = app.view.getBoundingClientRect(),
      stageBefore = app.q('#stage').getBoundingClientRect().height,
      rowsBefore = rowsOf();
    const text = () => {
      app.copied.length = 0;
      app.copy('text');
      return app.copied.join('');
    };
    const drawn = text();
    expect(drawn.length).toBeGreaterThan(10);
    await app.settle(); // the copy has finished (it closes the menu, which is not open yet)
    let rendered = 0;
    app.doc.addEventListener('rendered', () => rendered++);

    app.click('#bCopy');
    await app.frames(2); // part way through the slide
    const mid = app.view.getBoundingClientRect();
    expect(app.q('#stage').getBoundingClientRect().height).toBeLessThan(stageBefore);
    expect(mid.width).toBeCloseTo(before.width, 0);
    expect(mid.height).toBeCloseTo(before.height, 0); // clipped by the panel, not squashed

    await app.settle();
    expect(app.q('#copyMenu').hidden).toBe(false);
    expect(app.q('#stage').getBoundingClientRect().height).toBeLessThan(stageBefore - 50);
    expect(app.view.getBoundingClientRect().height).toBeCloseTo(before.height, 0);
    expect(rowsOf()).toBe(rowsBefore); // same grid: nothing was cropped or re-fitted
    expect(rendered).toBe(0); // and nothing was converted again
    expect(app.view.style.width).toBe('');

    // exporting with the panel open still has the stroke that is under it; the copy then shuts it
    expect(text()).toBe(drawn);
    await until(() => app.q('#copyMenu').hidden === true);
    expect(rowsOf()).toBe(rowsBefore);
    expect(text()).toBe(drawn);
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
    app.copy('text');
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
