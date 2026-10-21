import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { line, openApp, type App } from './harness';

let app: App;
beforeEach(async () => {
  app = await openApp('/index.html');
  await app.settle();
  app.click('#bClear'); // blank canvas, not the starter picture
  await app.settle();
});
afterEach(() => app.close());

const tool = (name: string) => app.click(`[data-tool="${name}"]`);
const pressed = (sel: string) => app.q(sel).getAttribute('aria-pressed');
const activeTool = () =>
  [...app.doc.querySelectorAll<HTMLElement>('button[data-tool]')].find(
    (b) => b.getAttribute('aria-pressed') === 'true',
  )?.dataset.tool;
const frame = () => app.q('#pickFrame');
const view = () => app.view.getBoundingClientRect();

/** a thick horizontal stroke across the middle, in the given swatch colour */
async function drawLine(color: string | null, size = 6) {
  if (color) app.click(`[data-color="${color}"]`);
  app.click('[data-mode="braille"]');
  app.setValue('#size', String(size));
  const v = view();
  app.stroke(line(v.width * 0.1, v.height * 0.5, v.width * 0.9, v.height * 0.5, 12));
  await app.frames(3);
}

/** move the pointer over the stroke (or `dy` px away from it) */
async function hover(dy = 0) {
  const v = view();
  app.fire('pointermove', v.width * 0.5, v.height * 0.5 + dy);
  await app.frames(1);
}

async function pick(dy = 0) {
  const v = view();
  app.fire('pointerdown', v.width * 0.5, v.height * 0.5 + dy);
  app.fire('pointerup', v.width * 0.5, v.height * 0.5 + dy);
  await app.frames(1);
}

describe('eyedropper button', () => {
  it('sits in the colour row right beside the palette, on its left, swatch-sized', () => {
    const btn = app.q('.eyedropper').getBoundingClientRect(),
      sw = app.q('.swatches').getBoundingClientRect(),
      palette = app.q('.sw.pick').getBoundingClientRect();
    expect(btn.left).toBeGreaterThanOrEqual(sw.right - 1);
    expect(btn.right).toBeLessThanOrEqual(palette.left + 1);
    expect(palette.left - btn.right).toBeLessThan(12);
    expect(Math.abs(btn.width - btn.height)).toBeLessThan(1); // a square, not squashed
    expect(btn.width).toBeGreaterThan(28);
    expect(Math.abs(btn.width - palette.width)).toBeLessThan(1); // as big as the palette
    expect(app.q('.eyedropper').getAttribute('aria-label')).toBe('滴管');
    tool('pick');
    expect(pressed('.eyedropper')).toBe('true');
    expect(activeTool()).toBe('pick');
  });
});

describe('eyedropper', () => {
  it('takes the colour of the character it is over and returns to the previous tool', async () => {
    await drawLine('#da1e28');
    app.click('[data-color="#0f62fe"]');
    tool('rect');
    tool('pick');
    await hover();
    await pick();
    expect(pressed('[data-color="#da1e28"]')).toBe('true');
    expect(pressed('[data-color="#0f62fe"]')).toBe('false');
    expect(activeTool()).toBe('rect'); // not back to the pen: the tool it was called from
    expect(frame().hidden).toBe(true);
  });

  it('shows a frame around the character it would take, with that colour', async () => {
    await drawLine('#da1e28');
    tool('pick');
    expect(frame().hidden).toBe(true);
    await hover();
    expect(frame().hidden).toBe(false);
    const f = frame().getBoundingClientRect(),
      v = view();
    // the pointer is inside the frame
    expect(v.left + v.width * 0.5).toBeGreaterThanOrEqual(f.left - 1);
    expect(v.left + v.width * 0.5).toBeLessThanOrEqual(f.right + 1);
    expect(v.top + v.height * 0.5).toBeGreaterThanOrEqual(f.top - 1);
    expect(v.top + v.height * 0.5).toBeLessThanOrEqual(f.bottom + 1);
    expect(getComputedStyle(app.q('#pickFrame .chip')).backgroundColor).toBe('rgb(218, 30, 40)');
    // moving off the drawing away from any character puts the frame away
    app.fire('pointermove', 5, 5);
    await app.frames(1);
    expect(frame().hidden).toBe(true);
  });

  it('snaps to a character in the next cell when the pointer is over an empty one', async () => {
    await drawLine('#da1e28', 2); // a thin line: most of its cells are mostly empty
    tool('pick');
    await hover(16); // one cell row below the line
    expect(frame().hidden).toBe(false);
    await pick(16);
    expect(pressed('[data-color="#da1e28"]')).toBe('true');
  });

  it('finds nothing when no character is nearby, says so, and stays on the eyedropper', async () => {
    await drawLine('#da1e28', 2);
    tool('pick');
    await pick(120);
    expect(app.q('#toast').textContent).toBe('附近沒有字元');
    expect(activeTool()).toBe('pick');
    expect(pressed('[data-color="#da1e28"]')).toBe('true'); // the colour chosen for drawing is untouched
  });

  it('reads the colour it was drawn in, even in grey mode', async () => {
    await drawLine('#24a148');
    app.click('[data-color="#0f62fe"]');
    app.click('[data-palette="gray"]');
    await app.frames(3);
    tool('pick');
    await pick();
    expect(pressed('[data-color="#24a148"]')).toBe('true');
  });

  it('puts an unlisted colour into the palette swatch', async () => {
    app.setValue('#colorPick', '#336699');
    await drawLine(null);
    app.click('[data-color="#da1e28"]');
    tool('pick');
    await pick();
    expect(app.q<HTMLInputElement>('#colorPick').value).toBe('#336699');
    expect(app.q('.sw.pick').classList.contains('on')).toBe(true);
    expect(app.q('.sw.pick').style.getPropertyValue('--pick')).toBe('#336699');
    expect(pressed('[data-color="#da1e28"]')).toBe('false');
  });

  it('takes theme ink as the ink swatch', async () => {
    app.click('[data-color="#000000"]');
    await drawLine(null);
    app.click('[data-color="#da1e28"]');
    tool('pick');
    await pick();
    expect(pressed('[data-color="#000000"]')).toBe('true');
  });

  it('does not draw while the eyedropper is in use', async () => {
    tool('pick');
    await pick();
    app.click('#bCopy');
    app.copy('text');
    expect(app.q('#toast').textContent).toBe('畫布是空的');
  });

  it('borrows a colour without changing between drawing and erasing', async () => {
    await drawLine('#da1e28');
    tool('rect');
    app.click('#tErase');
    tool('pick');
    await pick();
    expect(pressed('[data-color="#da1e28"]')).toBe('true');
    expect(activeTool()).toBe('rect'); // back on the shape it was called from
    expect(pressed('#tErase')).toBe('true'); // and still erasing
  });

  it('leaves the eyedropper when a colour is chosen by hand', () => {
    tool('rect');
    tool('pick');
    app.click('[data-color="#8a3ffc"]');
    expect(activeTool()).toBe('rect');
  });

  it('frames the right cell when the canvas is scaled to fit a fixed grid', async () => {
    app.click('#bAuto'); // leave auto mode
    app.setValue('#inCols', '24', 'change');
    app.setValue('#inRows', '12', 'change');
    await app.settle();
    expect(app.q('#stage').classList.contains('fixed')).toBe(true);
    await drawLine('#da1e28', 4);
    tool('pick');
    await hover();
    expect(frame().hidden).toBe(false);
    const f = frame().getBoundingClientRect(),
      v = view();
    expect(v.left + v.width * 0.5).toBeGreaterThanOrEqual(f.left - 1);
    expect(v.left + v.width * 0.5).toBeLessThanOrEqual(f.right + 1);
    expect(v.top + v.height * 0.5).toBeGreaterThanOrEqual(f.top - 1);
    expect(v.top + v.height * 0.5).toBeLessThanOrEqual(f.bottom + 1);
    // the frame is one cell of the scaled canvas: the canvas is 24 cells wide
    expect(f.width).toBeCloseTo(v.width / 24, 0);
    await pick();
    expect(pressed('[data-color="#da1e28"]')).toBe('true');
  });
});
