import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { line, openApp, type App } from './harness';

let app: App;
beforeEach(async () => {
  app = await openApp('/index.html');
  await app.win.document.fonts.load('600 48px "IBM Plex Mono"', 'HIAB中文');
  await app.settle();
  app.click('#bClear'); // start from a blank canvas, not the starter picture
  app.click('[data-mode="block"]');
  app.setValue('#size', '6');
  await app.settle();
});
afterEach(() => app.close());

const BLANK = '⠀'; // the default whitespace substitute
const tool = (name: string) => app.click(`[data-tool="${name}"]`);
const undoDisabled = () => app.q<HTMLButtonElement>('#bUndo').disabled;

async function copyText(): Promise<string[]> {
  await app.frames(2);
  app.copied.length = 0;
  app.click('#bCopy');
  app.copy('text');
  await app.frames();
  return app.copied.join('').split('\n');
}

const size = () => app.view.getBoundingClientRect();
/** drag from (a, b) to (c, d), given as fractions of the canvas */
function drag(a: number, b: number, c: number, d: number, steps = 8) {
  const v = size();
  app.stroke(line(v.width * a, v.height * b, v.width * c, v.height * d, steps));
}
const filled = (l: string) => [...l].filter((c) => c !== BLANK).length;

describe('tool bar', () => {
  const shapes = () => [...app.doc.querySelectorAll<HTMLElement>('button[data-tool]')];
  const actions = () => [...app.doc.querySelectorAll<HTMLElement>('[data-action]')];
  const pressed = (els: HTMLElement[]) =>
    els
      .filter((b) => b.getAttribute('aria-pressed') === 'true')
      .map((b) => b.dataset.tool ?? b.dataset.action);

  it('has one pressed shape across the eyedropper, the pen and the shape and text tools', () => {
    expect(shapes().map((b) => b.dataset.tool)).toEqual([
      'pick',
      'pen',
      'line',
      'circle',
      'rect',
      'text',
    ]);
    expect(pressed(shapes())).toEqual(['pen']); // freehand is the default
    tool('rect');
    expect(pressed(shapes())).toEqual(['rect']);
    tool('pick');
    expect(pressed(shapes())).toEqual(['pick']);
  });

  it('keeps draw / erase as a mode that does not depend on the shape', () => {
    expect(actions().map((b) => b.dataset.action)).toEqual(['draw', 'erase']);
    expect(pressed(actions())).toEqual(['draw']);
    app.click('#tErase');
    expect(pressed(actions())).toEqual(['erase']);
    expect(pressed(shapes())).toEqual(['pen']); // the shape did not change
    tool('circle');
    expect(pressed(actions())).toEqual(['erase']); // and the mode survived a change of shape
    app.click('#tDraw');
    expect(pressed(actions())).toEqual(['draw']);
    expect(pressed(shapes())).toEqual(['circle']);
  });

  it('goes back to drawing when a colour is chosen', () => {
    app.click('#tErase');
    app.click('[data-color="#24a148"]');
    expect(pressed(actions())).toEqual(['draw']);
    app.click('#tErase');
    app.setValue('#colorPick', '#336699');
    expect(pressed(actions())).toEqual(['draw']);
  });

  it('puts the shapes on their own row under the colours (pen first), draw / erase at its right end', () => {
    const colors = app.q('.colorrow').getBoundingClientRect(),
      tools = app.q('.tools').getBoundingClientRect(),
      pen = app.q('[data-tool="pen"]').getBoundingClientRect(),
      seg = app.q('.actionseg').getBoundingClientRect();
    expect(tools.top).toBeGreaterThanOrEqual(colors.bottom);
    expect(pen.left - tools.left).toBeLessThan(2); // the pen is the first button, on the left
    expect(tools.right - seg.right).toBeLessThan(2); // draw / erase sit at the right end
    expect(app.doc.querySelector('.colorrow .actionseg')).toBeNull();
    for (const name of ['pen', 'line', 'circle', 'rect', 'text']) {
      expect(app.q(`[data-tool="${name}"]`).getAttribute('aria-label')).toBeTruthy();
      expect(app.q(`[data-tool="${name}"] svg`)).toBeTruthy();
    }
  });

  it('lays the colour row out as the colours, the eyedropper, then the palette, with no scrolling', () => {
    const sw = app.q('.swatches').getBoundingClientRect(),
      eye = app.q('.eyedropper').getBoundingClientRect(),
      pal = app.q('.sw.pick').getBoundingClientRect();
    expect(app.doc.querySelectorAll('.swatches .sw')).toHaveLength(8);
    expect(app.q('.swatches').scrollWidth).toBeLessThanOrEqual(app.q('.swatches').clientWidth + 1);
    expect(eye.left).toBeGreaterThanOrEqual(sw.right - 1);
    expect(pal.left).toBeGreaterThanOrEqual(eye.right - 1);
    expect(pal.left - eye.right).toBeLessThan(12); // the eyedropper is right beside the palette
    expect(app.q('.sw.pick').closest('.swatches')).toBeNull();
  });

  it('lines the eyedropper + palette pair up under the Redo button, with square buttons', () => {
    const redo = app.q('#bRedo').getBoundingClientRect(),
      pair = app.q('.pair').getBoundingClientRect(),
      eye = app.q('.eyedropper').getBoundingClientRect(),
      pal = app.q('.sw.pick').getBoundingClientRect();
    expect(Math.abs(pair.left - redo.left)).toBeLessThan(0.5);
    expect(Math.abs(pair.right - redo.right)).toBeLessThan(0.5);
    // the buttons span the pair edge to edge, and are not squashed flat
    expect(Math.abs(eye.left - pair.left)).toBeLessThan(0.5);
    expect(Math.abs(pal.right - pair.right)).toBeLessThan(0.5);
    for (const b of [eye, pal]) expect(Math.abs(b.width - b.height)).toBeLessThan(1);
    expect(eye.width).toBeGreaterThan(28);
    expect(pal.width).toBeGreaterThan(28);
  });

  it('makes draw / erase exactly as wide as undo + redo, with the same right edge', () => {
    const hist = app.q('.hist').getBoundingClientRect(),
      seg = app.q('.actionseg').getBoundingClientRect();
    expect(Math.abs(seg.width - hist.width)).toBeLessThan(0.5);
    expect(Math.abs(seg.right - hist.right)).toBeLessThan(0.5);
    expect(Math.abs(seg.left - hist.left)).toBeLessThan(0.5);
    const draw = app.q('#tDraw').getBoundingClientRect(),
      erase = app.q('#tErase').getBoundingClientRect();
    expect(Math.abs(draw.width - erase.width)).toBeLessThanOrEqual(1.5); // two halves (the second has a 1px divider)
  });

  it('shows the font-size row, under the shapes, only for the text tool', async () => {
    expect(app.q('#textOpts').hidden).toBe(true);
    tool('text');
    expect(app.q('#textOpts').hidden).toBe(false);
    await app.settle();
    expect(app.q('#textOpts').getBoundingClientRect().top).toBeGreaterThanOrEqual(
      app.q('.tools').getBoundingClientRect().bottom,
    );
    tool('pen');
    await app.settle();
    expect(app.q('#textOpts').hidden).toBe(true);
  });

  it('shows a palette icon whose disc follows the custom colour', () => {
    const pick = app.q('.sw.pick');
    expect(pick.querySelector('svg.palette')).toBeTruthy();
    expect(pick.querySelectorAll('svg.palette circle')).toHaveLength(4);
    app.setValue('#colorPick', '#336699');
    expect(pick.style.getPropertyValue('--pick')).toBe('#336699');
    expect(getComputedStyle(pick.querySelector('.disc') as SVGElement).fill).toBe(
      'rgb(51, 102, 153)',
    );
  });

  it('shows an I-beam for text and the brush ring for the rest', () => {
    const cursor = () => getComputedStyle(app.view).cursor;
    expect(cursor()).toBe('none');
    tool('text');
    expect(cursor()).toBe('text');
    app.fire('pointermove', 50, 50);
    expect(app.q('#brush').hidden).toBe(true);
    tool('line');
    expect(cursor()).toBe('none');
    app.fire('pointermove', 50, 50);
    expect(app.q('#brush').hidden).toBe(false);
  });
});

describe('shapes', () => {
  it('draws a straight line along the drag', async () => {
    tool('line');
    drag(0.1, 0.5, 0.9, 0.5);
    const rows = (await copyText()).filter((l) => l !== '');
    expect(rows.length).toBeLessThanOrEqual(2);
    expect(filled(rows[0])).toBeGreaterThan(30);
  });

  it('draws a rectangle outline: full top and bottom, sides only in between', async () => {
    tool('rect');
    drag(0.2, 0.2, 0.8, 0.8);
    const rows = await copyText();
    expect(rows.length).toBeGreaterThan(6);
    const width = Math.max(...rows.map((l) => [...l].length));
    expect(filled(rows[0])).toBe(width); // top edge, corner to corner
    expect(filled(rows[rows.length - 1])).toBe(width);
    const mid = [...rows[Math.floor(rows.length / 2)]];
    expect(mid[0]).not.toBe(BLANK);
    expect(mid[mid.length - 1]).not.toBe(BLANK);
    expect(mid[Math.floor(mid.length / 2)]).toBe(BLANK); // hollow
  });

  it('draws a circle in the dragged box: empty corners, touching each side, hollow', async () => {
    tool('circle');
    drag(0.3, 0.2, 0.7, 0.8);
    const rows = await copyText();
    const n = rows.length;
    const first = [...rows[0]],
      last = [...rows[n - 1]];
    expect(first[0]).toBe(BLANK); // the corners of the box are empty
    expect(last[0]).toBe(BLANK);
    const third = (r: string[]) => r.slice(Math.floor(r.length / 3), Math.ceil((2 * r.length) / 3));
    expect(third(first).some((c) => c !== BLANK)).toBe(true); // the top of the circle
    expect(third(last).some((c) => c !== BLANK)).toBe(true); // and its bottom
    const middle = rows.slice(Math.floor(n / 2) - 1, Math.floor(n / 2) + 2).map((r) => [...r]);
    expect(middle.some((r) => r[0] !== BLANK)).toBe(true); // the left extreme
    for (const r of middle) expect(r[Math.floor(r.length / 2)]).toBe(BLANK); // hollow
  });

  it('gives the same shape whichever corner the drag starts from', async () => {
    tool('rect');
    drag(0.2, 0.2, 0.8, 0.8);
    const forward = await copyText();
    app.click('#bUndo');
    drag(0.8, 0.8, 0.2, 0.2);
    expect(await copyText()).toEqual(forward);
  });

  it('previews while dragging, follows the pointer, and Escape cancels', async () => {
    tool('rect');
    const v = size();
    app.fire('pointerdown', v.width * 0.2, v.height * 0.2);
    app.fire('pointermove', v.width * 0.5, v.height * 0.5);
    const small = (await copyText()).join('\n');
    expect(small.length).toBeGreaterThan(10);
    app.fire('pointermove', v.width * 0.8, v.height * 0.8);
    const big = (await copyText()).join('\n');
    expect(big.length).toBeGreaterThan(small.length);
    app.doc.dispatchEvent(new app.win.KeyboardEvent('keydown', { key: 'Escape' }));
    app.fire('pointerup', v.width * 0.8, v.height * 0.8);
    expect((await copyText()).join('')).toBe('');
    expect(undoDisabled()).toBe(false); // the clear from setup is still undoable, nothing new was added
  });

  it('leaves no undo step for a plain click, and one step for a drag that undo removes', async () => {
    tool('circle');
    app.click('#bUndo'); // undo the setup clear so the count is known
    app.click('#bClear');
    app.click('#bUndo');
    app.click('#bClear');
    const v = size();
    app.stroke([[v.width / 2, v.height / 2]]); // press and release in place
    await app.frames(2);
    const stepsAfterClick = !undoDisabled();
    expect(stepsAfterClick).toBe(true); // only the clear
    drag(0.2, 0.2, 0.8, 0.8);
    app.click('#bUndo'); // removes the circle, not the clear
    expect((await copyText()).join('')).toBe('');
    app.click('#bUndo'); // removes the clear: the starter picture is back
    expect((await copyText()).join('').length).toBeGreaterThan(50);
  });

  it('draws shapes in the current pen colour', async () => {
    app.click('[data-color="#da1e28"]');
    tool('line');
    drag(0.1, 0.5, 0.9, 0.5);
    app.copied.length = 0;
    await app.frames(2);
    app.copy('html');
    expect(app.copied.join('')).toContain('color:#da1e28');
  });
});

describe('text', () => {
  const input = () => app.q<HTMLInputElement>('#textEdit');
  async function type(value: string) {
    input().value = value;
    input().dispatchEvent(new app.win.Event('input', { bubbles: true }));
    await app.sleep(150);
    await app.frames(2);
  }
  const key = (k: string, init: KeyboardEventInit = {}) =>
    input().dispatchEvent(new app.win.KeyboardEvent('keydown', { key: k, bubbles: true, ...init }));
  const open = (x = 0.2, y = 0.3) => {
    const v = size();
    app.fire('pointerdown', v.width * x, v.height * y);
    app.fire('pointerup', v.width * x, v.height * y);
  };

  it('opens an editor at the click and previews what is typed as characters', async () => {
    tool('text');
    open();
    expect(input().hidden).toBe(false);
    expect(app.doc.activeElement).toBe(input());
    await type('HI');
    expect((await copyText()).join('').length).toBeGreaterThan(10);
  });

  it('keeps the text on Enter, as one undo step', async () => {
    tool('text');
    open();
    await type('HI');
    key('Enter');
    expect(input().hidden).toBe(true);
    expect(undoDisabled()).toBe(false);
    const rows = await copyText();
    expect(rows.join('').length).toBeGreaterThan(10);
    app.click('#bUndo');
    expect((await copyText()).join('')).toBe('');
  });

  it('drops the text on Escape and leaves nothing to undo', async () => {
    tool('text');
    app.click('#bUndo'); // back to the starter picture, so the undo stack is known to be short
    app.click('#bClear');
    app.click('#bUndo');
    const before = (await copyText()).join('\n');
    open();
    await type('HI');
    key('Escape');
    expect(input().hidden).toBe(true);
    expect((await copyText()).join('\n')).toBe(before);
  });

  it('records nothing when no text was typed', () => {
    tool('text');
    const redoWas = app.q<HTMLButtonElement>('#bRedo').disabled,
      undoWas = undoDisabled();
    open();
    key('Enter');
    expect(input().hidden).toBe(true);
    expect(app.q<HTMLButtonElement>('#bRedo').disabled).toBe(redoWas);
    expect(undoDisabled()).toBe(undoWas);
  });

  it('waits for the input method: Enter while composing does not commit', async () => {
    tool('text');
    open();
    input().dispatchEvent(new app.win.CompositionEvent('compositionstart'));
    await type('中文');
    key('Enter', { isComposing: true });
    expect(input().hidden).toBe(false);
    input().dispatchEvent(new app.win.CompositionEvent('compositionend', { data: '中文' }));
    key('Enter');
    expect(input().hidden).toBe(true);
    expect((await copyText()).join('').length).toBeGreaterThan(10);
  });

  it('commits when another tool is chosen', async () => {
    tool('text');
    open();
    await type('AB');
    tool('pen');
    expect(input().hidden).toBe(true);
    expect(undoDisabled()).toBe(false);
    expect((await copyText()).join('').length).toBeGreaterThan(10);
  });

  it('follows the font size slider and the pen colour while typing', async () => {
    tool('text');
    open(0.1, 0.1);
    await type('A');
    const small = (await copyText()).length;
    app.setValue('#textSize', '120');
    await app.sleep(150);
    expect((await copyText()).length).toBeGreaterThan(small);
    app.click('[data-color="#0f62fe"]');
    await app.sleep(100);
    key('Enter');
    app.copied.length = 0;
    app.copy('html');
    expect(app.copied.join('')).toContain('color:#0f62fe');
  });
});

describe('stroke width and font size sliders', () => {
  const width = () => app.q<HTMLInputElement>('#size');
  const rect = (sel: string) => app.q(sel).getBoundingClientRect();
  const fieldOf = (sel: string) => app.q(sel).closest('.field, .textopts') as HTMLElement;

  it('has the width enabled for the pen and every shape', () => {
    expect(width().disabled).toBe(false);
    for (const name of ['line', 'circle', 'rect', 'pen'] as const) {
      tool(name);
      expect(width().disabled, name).toBe(false);
    }
  });

  it('greys out the width for the text tool and the eyedropper, and brings it back', () => {
    app.setValue('#size', '17');
    tool('text');
    expect(width().disabled).toBe(true);
    expect(width().value).toBe('17'); // the value is kept
    tool('pen');
    expect(width().disabled).toBe(false);
    tool('rect');
    tool('pick');
    expect(width().disabled).toBe(true);
    tool('rect'); // back to the shape the eyedropper was called from
    expect(width().disabled).toBe(false);
    expect(Number(app.win.getComputedStyle(fieldOf('#size')).opacity)).toBe(1);
    tool('text');
    expect(Number(app.win.getComputedStyle(fieldOf('#size')).opacity)).toBeLessThan(0.6);
  });

  it('puts the width right under the tool row, or under the font size when that shows', async () => {
    const tools = rect('.tools'),
      modes = rect('.modes');
    expect(app.q('#textOpts').hidden).toBe(true);
    expect(rect('#size').top).toBeGreaterThanOrEqual(tools.bottom);
    expect(rect('#size').top - tools.bottom).toBeLessThan(30);
    expect(rect('#size').bottom).toBeLessThanOrEqual(modes.top);
    tool('text');
    await app.settle();
    expect(rect('#textSize').top).toBeGreaterThanOrEqual(rect('.tools').bottom);
    expect(rect('#size').top).toBeGreaterThanOrEqual(rect('#textSize').bottom);
    expect(rect('#size').bottom).toBeLessThanOrEqual(rect('.modes').top);
  });

  it('lines the two sliders and their numbers up', async () => {
    tool('text');
    await app.settle();
    expect(rect('#textSize').left).toBeCloseTo(rect('#size').left, 0);
    expect(rect('#textSize').right).toBeCloseTo(rect('#size').right, 0);
    expect(rect('#textSizeOut').left).toBeCloseTo(rect('#sizeOut').left, 0);
    expect(rect('#textSizeOut').right).toBeCloseTo(rect('#sizeOut').right, 0);
  });
});

describe('text caret', () => {
  const input = () => app.q<HTMLInputElement>('#textEdit');
  const caret = () => app.q('#textCaret');
  const box = () => caret().getBoundingClientRect();
  const click = (x = 0.2, y = 0.3) => {
    const v = size();
    app.fire('pointerdown', v.width * x, v.height * y);
    app.fire('pointerup', v.width * x, v.height * y);
    return { x: v.width * x, y: v.height * y };
  };
  const type = async (value: string) => {
    input().value = value;
    input().dispatchEvent(new app.win.Event('input', { bubbles: true }));
    await app.sleep(150);
    await app.frames(2);
  };
  const key = (k: string) =>
    input().dispatchEvent(new app.win.KeyboardEvent('keydown', { key: k, bubbles: true }));

  it('is not there until the text tool is used', () => {
    expect(caret().hidden).toBe(true);
    tool('text');
    expect(caret().hidden).toBe(true);
  });

  it('appears at the click, as tall as the text will be', async () => {
    tool('text');
    const at = click();
    await app.frames(2);
    expect(caret().hidden).toBe(false);
    const v = app.view.getBoundingClientRect(),
      b = box();
    expect(b.left - v.left).toBeCloseTo(at.x, 0);
    expect(b.top - v.top).toBeLessThanOrEqual(at.y + 1); // tall letters reach up to the click point
    expect(b.top - v.top).toBeGreaterThan(at.y - 48);
    // the default size is 48: the bar spans the letters, from ascenders to descenders
    expect(b.height).toBeGreaterThanOrEqual(48 * 0.8);
    expect(b.height).toBeLessThanOrEqual(48 * 1.4);
  });

  it('grows and shrinks with the font size slider', async () => {
    tool('text');
    click();
    await app.frames(2);
    const small = box().height;
    app.setValue('#textSize', '120');
    await app.frames(2);
    const big = box().height;
    expect(big / small).toBeGreaterThan(2.2);
    expect(big / small).toBeLessThan(2.8);
    app.setValue('#textSize', '24');
    await app.frames(2);
    expect(box().height).toBeLessThan(small);
  });

  it('follows the typing and the cursor, and takes the pen colour', async () => {
    tool('text');
    click();
    await app.frames(2);
    const start = box().left;
    await type('HI');
    expect(box().left).toBeGreaterThan(start + 20);
    const end = box().left;
    input().setSelectionRange(0, 0);
    input().dispatchEvent(new app.win.KeyboardEvent('keyup', { key: 'Home', bubbles: true }));
    await app.frames(2);
    expect(box().left).toBeCloseTo(start, 0);
    input().setSelectionRange(2, 2);
    input().dispatchEvent(new app.win.KeyboardEvent('keyup', { key: 'End', bubbles: true }));
    await app.frames(2);
    expect(box().left).toBeCloseTo(end, 0);
    app.click('[data-color="#0f62fe"]');
    await app.frames(2);
    expect(app.win.getComputedStyle(caret()).backgroundColor).toBe('rgb(15, 98, 254)');
  });

  it('blinks, and goes away on Enter, Esc and a tool change', async () => {
    tool('text');
    click();
    await app.frames(2);
    expect(app.win.getComputedStyle(caret()).animationName).toBe('caret-blink');
    key('Enter');
    expect(caret().hidden).toBe(true);
    click(0.4, 0.5);
    await app.frames(2);
    expect(caret().hidden).toBe(false);
    key('Escape');
    expect(caret().hidden).toBe(true);
    click(0.5, 0.5);
    await app.frames(2);
    tool('pen');
    expect(caret().hidden).toBe(true);
  });

  it('is not counted as motion that has to finish, and stays inside the paper', async () => {
    tool('text');
    click(0.1, 0.1);
    await app.settle(); // would wait forever on an endless blink
    expect(app.animations()).toBe(0);
    const p = app.q('#paper').getBoundingClientRect(),
      b = box();
    expect(b.left).toBeGreaterThanOrEqual(p.left - 1);
    expect(b.right).toBeLessThanOrEqual(p.right + 1);
  });

  it('scales with a fixed grid that is fitted to the stage', async () => {
    tool('text');
    click(0.2, 0.3);
    await app.frames(2);
    const fullHeight = box().height,
      cols = Number(/^(\d+) ×/.exec(app.q('#meta').textContent ?? '')?.[1]),
      cellW = app.view.getBoundingClientRect().width / cols; // about one cell, in CSS px
    key('Escape');
    app.click('#bAuto'); // leave 滿版: a fixed grid, shown at some scale
    app.setValue('#inCols', '24', 'change');
    app.setValue('#inRows', '12', 'change');
    await app.settle();
    const scale = app.q('#paper').getBoundingClientRect().width / (24 * cellW);
    expect(Math.abs(scale - 1)).toBeGreaterThan(0.1); // the grid really is scaled
    click(0.2, 0.3);
    await app.frames(2);
    expect(box().height / fullHeight).toBeCloseTo(scale, 0);
    expect(box().height / fullHeight / scale).toBeGreaterThan(0.9);
    expect(box().height / fullHeight / scale).toBeLessThan(1.1);
  });
});

describe('erase mode applies to every shape', () => {
  const input = () => app.q<HTMLInputElement>('#textEdit');
  // braille mode, and ink counted in dots: fine enough to notice a thin cut
  const dots = (n: number): number => n.toString(2).replaceAll('0', '').length;
  async function ink(): Promise<number> {
    await app.frames(3);
    app.copied.length = 0;
    app.copy('text');
    let n = 0;
    for (const c of app.copied.join('')) {
      const code = c.charCodeAt(0) - 0x2800;
      if (code > 0 && code < 256) n += dots(code);
    }
    return n;
  }
  beforeEach(() => app.click('[data-mode="braille"]'));
  /** a thick horizontal band across the middle of the canvas, drawn with the pen */
  async function band(): Promise<number> {
    app.setValue('#size', '30');
    const v = size();
    app.stroke(line(v.width * 0.1, v.height * 0.5, v.width * 0.9, v.height * 0.5, 12));
    return ink();
  }

  it('erases freehand', async () => {
    const before = await band();
    app.click('#tErase');
    app.setValue('#size', '12');
    const v = size();
    app.stroke(line(v.width * 0.5, v.height * 0.2, v.width * 0.5, v.height * 0.8, 8));
    expect(await ink()).toBeLessThan(before);
  });

  it('erases freehand as wide as it draws: the same stroke drawn then erased leaves almost nothing', async () => {
    const v = size();
    const path = line(v.width * 0.1, v.height * 0.5, v.width * 0.9, v.height * 0.5, 12);
    app.setValue('#size', '30');
    app.stroke(path);
    const before = await ink();
    expect(before).toBeGreaterThan(40);
    app.click('#tErase');
    app.stroke(path); // the same width: a wider eraser would be needed to clear a fringe
    expect(await ink()).toBeLessThan(before * 0.25);
  });

  it('erases along a line with the width it draws with, which cancels a line drawn at that width', async () => {
    tool('line');
    app.setValue('#size', '30');
    const v = size();
    app.stroke(line(v.width * 0.1, v.height * 0.5, v.width * 0.9, v.height * 0.5, 12));
    const before = await ink();
    expect(before).toBeGreaterThan(40);
    app.click('#tErase');
    app.stroke(line(v.width * 0.1, v.height * 0.5, v.width * 0.9, v.height * 0.5, 12));
    expect(await ink()).toBeLessThan(before * 0.25);
  });

  it.each(['rect', 'circle'])('cuts the outline of a %s out of the ink under it', async (shape) => {
    const before = await band();
    tool(shape);
    app.click('#tErase');
    app.setValue('#size', '8');
    drag(0.3, 0.3, 0.7, 0.7);
    const after = await ink();
    expect(after).toBeLessThan(before);
    expect(after).toBeGreaterThan(0); // the inside and the rest of the band are still there
  });

  it('cuts out the shape of typed text, and undo puts the ink back', async () => {
    const before = await band();
    tool('text');
    app.click('#tErase');
    app.setValue('#textSize', '100');
    const v = size();
    app.fire('pointerdown', v.width * 0.25, v.height * 0.3);
    app.fire('pointerup', v.width * 0.25, v.height * 0.3);
    input().value = 'HI';
    input().dispatchEvent(new app.win.Event('input', { bubbles: true }));
    await app.sleep(200);
    expect(await ink()).toBeLessThan(before); // the live preview already shows the cut-out
    input().dispatchEvent(new app.win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const cut = await ink();
    expect(cut).toBeLessThan(before);
    app.click('#bUndo');
    expect(await ink()).toBe(before);
    expect(cut).toBeLessThan(before);
  });

  it('shows the dashed ring for erasing with every shape, as wide as the line it erases', () => {
    app.click('#tErase');
    app.setValue('#size', '20');
    for (const name of ['pen', 'line', 'circle', 'rect'] as const) {
      const width = 20; // erasing is as wide as drawing, for every shape
      tool(name);
      app.fire('pointermove', 100, 80);
      const ring = app.q('#brush');
      expect(ring.classList.contains('erase'), name).toBe(true);
      expect(ring.getBoundingClientRect().width, name).toBe(width);
    }
    tool('text');
    app.fire('pointermove', 100, 80);
    expect(app.q('#brush').hidden).toBe(true);
  });
});
