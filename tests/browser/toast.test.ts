import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { line, openApp, type App } from './harness';

let app: App;
beforeEach(async () => {
  app = await openApp('/index.html');
  await app.frames();
});
afterEach(() => app.close());

const toast = () => app.q('#toast');
const rect = (sel: string) => app.q(sel).getBoundingClientRect();

/** the toast is visible, sits under the header inside the canvas area, and is centred */
function expectBelowHeader() {
  expect(toast().hidden).toBe(false);
  const t = toast().getBoundingClientRect(),
    shell = rect('.shell'),
    paper = rect('#paper');
  expect(t.top).toBeGreaterThanOrEqual(shell.bottom);
  expect(t.top - shell.bottom).toBeLessThan(24);
  expect(t.bottom).toBeLessThanOrEqual(paper.bottom);
  expect(t.top + t.height / 2).toBeLessThan(app.win.innerHeight / 2);
  expect(t.left + t.width / 2).toBeCloseTo(app.win.innerWidth / 2, 0);
}

describe('toast placement', () => {
  it('shows "canvas is empty" below the header', async () => {
    app.click('#bClear');
    await app.frames(); // the converted grid refreshes on the next frame
    app.click('#bCopy');
    app.click('[data-copy="text"]');
    expect(toast().textContent).toBe('畫布是空的');
    expectBelowHeader();
  });

  it('shows the copy confirmation below the header', async () => {
    const v = app.view.getBoundingClientRect();
    app.stroke(line(20, v.height / 2, v.width - 20, v.height / 2, 10));
    app.click('#bCopy');
    app.click('[data-copy="text"]');
    await app.frames();
    expect(toast().textContent).toBe('已複製純文字');
    expectBelowHeader();
  });

  it('shows the clear confirmation below the header, then hides', async () => {
    app.click('#bClear');
    expect(toast().textContent).toBe('已清空，按復原可救回');
    expectBelowHeader();
    await app.sleep(2100);
    expect(toast().hidden).toBe(true);
  });
});
