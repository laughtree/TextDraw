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
  it('has one pressed tool across eyedropper, pen, eraser and the shape and text tools', () => {
    const btns = [...app.doc.querySelectorAll<HTMLElement>('button[data-tool]')];
    expect(btns.map((b) => b.dataset.tool)).toEqual([
      'pick',
      'pen',
      'erase',
      'line',
      'circle',
      'rect',
      'text',
    ]);
    tool('rect');
    expect(btns.map((b) => b.getAttribute('aria-pressed'))).toEqual([
      'false',
      'false',
      'false',
      'false',
      'false',
      'true',
      'false',
    ]);
    tool('erase');
    expect(
      btns.filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.dataset.tool),
    ).toEqual(['erase']);
  });

  it('puts the shape and text tools on their own row under the colours, on the left', () => {
    const colors = app.q('.colorrow').getBoundingClientRect(),
      tools = app.q('.tools').getBoundingClientRect(),
      first = app.q('[data-tool="line"]').getBoundingClientRect();
    expect(tools.top).toBeGreaterThanOrEqual(colors.bottom);
    expect(first.left - tools.left).toBeLessThan(2);
    for (const name of ['line', 'circle', 'rect', 'text']) {
      expect(app.q(`[data-tool="${name}"]`).getAttribute('aria-label')).toBeTruthy();
      expect(app.q(`[data-tool="${name}"] svg`)).toBeTruthy();
    }
  });

  it('shows the font-size slider only for the text tool', async () => {
    expect(app.q('#textOpts').hidden).toBe(true);
    tool('text');
    expect(app.q('#textOpts').hidden).toBe(false);
    await app.settle();
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

  it('draws a circle in the dragged box: empty corners, touching the middle of each side', async () => {
    tool('circle');
    drag(0.3, 0.2, 0.7, 0.8);
    const rows = await copyText();
    const first = [...rows[0]],
      last = [...rows[rows.length - 1]];
    expect(first[0]).toBe(BLANK); // the corner of the box is empty
    expect(last[0]).toBe(BLANK);
    expect(first[Math.floor(first.length / 2)]).not.toBe(BLANK); // top of the circle
    const mid = [...rows[Math.floor(rows.length / 2)]];
    expect(mid[0]).not.toBe(BLANK); // left and right extremes
    expect(mid[mid.length - 1]).not.toBe(BLANK);
    expect(mid[Math.floor(mid.length / 2)]).toBe(BLANK); // hollow
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
    app.click('#bUndo');
    const redoWas = app.q<HTMLButtonElement>('#bRedo').disabled;
    open();
    key('Enter');
    expect(input().hidden).toBe(true);
    expect(app.q<HTMLButtonElement>('#bRedo').disabled).toBe(redoWas);
    expect(undoDisabled()).toBe(true);
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
