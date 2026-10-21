import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openApp, type App } from './harness';

let app: App;
beforeEach(async () => {
  app = await openApp('/index.html');
  await app.win.document.fonts.load('13px "IBM Plex Mono"', 'M');
  await app.settle();
});
afterEach(() => app.close());

const groups = () => [...app.doc.querySelectorAll<HTMLElement>('.seg')];
const pressed = (group: Element) =>
  [...group.querySelectorAll<HTMLElement>('button')].filter(
    (b) => b.getAttribute('aria-pressed') === 'true',
  );
const css = (el: Element, prop: string) => (el as HTMLElement).style.getPropertyValue(prop);

/** where a button sits inside its group, ignoring the group's border */
function slot(group: HTMLElement, btn: Element) {
  const r = btn.getBoundingClientRect(),
    g = group.getBoundingClientRect();
  return { x: r.left - g.left - group.clientLeft, w: r.width };
}

/** the x translation of the group's sliding layer right now */
function layerX(group: Element): number {
  const t = getComputedStyle(group, '::before').transform;
  return t === 'none' ? 0 : Number(/matrix\(([^)]*)\)/.exec(t)?.[1].split(',')[4]);
}

/** are there transitions running on the ::before (or ::after) layer? */
function sliding(pseudo = '::before'): boolean {
  return app.doc
    .getAnimations()
    .some((a) => (a.effect as KeyframeEffect | null)?.pseudoElement === pseudo);
}

/** [group label, a button that is not the chosen one] for each group in view */
const MOVES: [string, string][] = [
  ['色彩模式', '[data-palette="gray"]'],
  ['形狀與文字', '[data-tool="rect"]'],
  ['繪製或擦除', '#tErase'],
  ['轉換樣式', '[data-mode="block"]'],
];

describe('selection layer in each button group', () => {
  it('is placed under the chosen button of every visible group when the page loads, without animating', async () => {
    const fresh = await openApp('/index.html');
    const layers = fresh.doc
      .getAnimations()
      .filter((x) =>
        ['::before', '::after'].includes((x.effect as KeyframeEffect).pseudoElement ?? ''),
      );
    expect(layers).toHaveLength(0); // the selection layers are put in place, they do not slide in
    fresh.close();
    for (const g of groups().filter((x) => x.getClientRects().length)) {
      expect(g.classList.contains('slides')).toBe(true);
      const [btn] = pressed(g);
      const { x, w } = slot(g, btn);
      expect(parseFloat(css(g, '--x')), g.ariaLabel ?? '').toBeCloseTo(x, 0);
      expect(parseFloat(css(g, '--w')), g.ariaLabel ?? '').toBeCloseTo(w, 0);
      expect(css(g, '--o')).toBe('1');
    }
  });

  it.each(MOVES)('slides in %s to the newly chosen button', async (label, sel) => {
    const g = app.q(`.seg[aria-label="${label}"]`);
    const before = layerX(g);
    app.click(sel);
    await app.frames(1);
    expect(sliding(), 'a transition is running').toBe(true);
    expect(pressed(g)).toHaveLength(1); // still a single choice
    expect(pressed(g)[0]).toBe(app.q(sel));
    await app.settle();
    const { x, w } = slot(g, app.q(sel));
    expect(layerX(g)).toBeCloseTo(x, 0);
    expect(parseFloat(css(g, '--w'))).toBeCloseTo(w, 0);
    expect(layerX(g)).not.toBeCloseTo(before, 0);
  });

  it('slides back to the first choice again', async () => {
    const g = app.q('.seg[aria-label="轉換樣式"]');
    const first = pressed(g)[0];
    const start = layerX(g);
    app.click('[data-mode="custom"]');
    await app.settle();
    expect(layerX(g)).toBeGreaterThan(start + 50);
    first.click();
    await app.frames(1);
    expect(sliding()).toBe(true);
    await app.settle();
    expect(layerX(g)).toBeCloseTo(start, 0);
  });
});

describe('eyedropper and the shape group', () => {
  it('fades the shape selection out while the eyedropper is in use and back in afterwards', async () => {
    const shapes = app.q('.seg[aria-label="形狀與文字"]');
    app.click('[data-tool="circle"]');
    await app.settle();
    const circleX = layerX(shapes);
    app.click('.eyedropper');
    await app.settle();
    expect(css(shapes, '--o')).toBe('0');
    expect(getComputedStyle(shapes, '::before').opacity).toBe('0');
    expect(getComputedStyle(app.q('.eyedropper')).boxShadow).not.toBe('none');
    app.click('[data-tool="circle"]');
    await app.settle();
    expect(css(shapes, '--o')).toBe('1');
    expect(getComputedStyle(shapes, '::before').opacity).toBe('1');
    expect(layerX(shapes)).toBeCloseTo(circleX, 0);
    expect(getComputedStyle(app.q('.eyedropper')).boxShadow).toBe('none');
  });
});

describe('colour frame', () => {
  const row = () => app.q('.colorrow');
  const frameOn = (btn: Element) => {
    const r = btn.getBoundingClientRect(),
      b = row().getBoundingClientRect();
    return { x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height };
  };

  it('starts on the ink swatch, with the size of the button', () => {
    const want = frameOn(app.q('[data-color="#000000"]'));
    expect(parseFloat(css(row(), '--rx'))).toBeCloseTo(want.x, 0);
    expect(parseFloat(css(row(), '--rw'))).toBeCloseTo(want.w, 0);
    expect(parseFloat(css(row(), '--rh'))).toBeCloseTo(want.h, 0);
    expect(css(row(), '--ro')).toBe('1');
  });

  it('slides to a swatch, then into the palette across containers', async () => {
    app.click('[data-color="#da1e28"]');
    await app.frames(1);
    expect(sliding('::after')).toBe(true);
    await app.settle();
    let want = frameOn(app.q('[data-color="#da1e28"]'));
    expect(parseFloat(css(row(), '--rx'))).toBeCloseTo(want.x, 0);

    app.setValue('#colorPick', '#336699');
    await app.settle();
    want = frameOn(app.q('.sw.pick'));
    expect(parseFloat(css(row(), '--rx'))).toBeCloseTo(want.x, 0);
    expect(parseFloat(css(row(), '--rw'))).toBeCloseTo(want.w, 0);
    expect(app.q('.sw.pick').closest('.swatches')).toBeNull(); // a different container
    expect(css(row(), '--ro')).toBe('1');
  });

  it('stays on the chosen colour while the eyedropper is selected', async () => {
    app.click('[data-color="#24a148"]');
    await app.settle();
    const x = css(row(), '--rx');
    app.click('.eyedropper');
    await app.settle();
    expect(css(row(), '--rx')).toBe(x);
    expect(css(row(), '--ro')).toBe('1');
  });
});

describe('groups that are not on screen yet, and layout changes', () => {
  it('place the export menu groups once the menu opens, and slide there', async () => {
    const format = app.q('.seg[aria-label="匯出格式"]'),
      space = app.q('.seg[aria-label="空白字元"]');
    expect(css(format, '--w')).toBe(''); // not measured while the menu is closed
    app.click('#bCopy');
    await app.settle();
    for (const g of [format, space]) {
      const { x, w } = slot(g, pressed(g)[0]);
      expect(parseFloat(css(g, '--x'))).toBeCloseTo(x, 0);
      expect(parseFloat(css(g, '--w'))).toBeCloseTo(w, 0);
    }
    app.click('[data-format="html"]');
    await app.frames(1);
    expect(sliding()).toBe(true);
    await app.settle();
    expect(layerX(format)).toBeCloseTo(slot(format, app.q('[data-format="html"]')).x, 0);
    app.click('[data-space=" "]');
    await app.settle();
    expect(layerX(space)).toBeCloseTo(slot(space, app.q('[data-space=" "]')).x, 0);
  });

  it('measure again, without sliding, when the window changes size', async () => {
    const g = app.q('.seg[aria-label="轉換樣式"]');
    app.click('[data-mode="shade"]');
    await app.settle();
    app.iframe.style.width = '360px';
    await app.frames(4);
    const { x, w } = slot(g, app.q('[data-mode="shade"]'));
    expect(parseFloat(css(g, '--x'))).toBeCloseTo(x, 0);
    expect(parseFloat(css(g, '--w'))).toBeCloseTo(w, 0);
    expect(sliding()).toBe(false);
  });
});
