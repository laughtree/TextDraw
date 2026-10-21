import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { line, openApp, type App } from './harness';

let app: App;
beforeEach(async () => {
  app = await openApp('/index.html');
  await app.win.document.fonts.load('13px "IBM Plex Mono"', 'M');
  await app.settle();
  app.click('#bClear'); // blank canvas, not the starter picture
  await app.settle();
});
afterEach(() => app.close());

const toast = () => app.q('#toast').textContent;
const meta = () => app.q('#meta').textContent;
const pressed = (sel: string) => app.q(sel).getAttribute('aria-pressed');

async function until(cond: () => boolean, ms = 3000) {
  for (let t = 0; t < ms && !cond(); t += 25) await app.sleep(25);
  expect(cond(), 'condition met in time').toBe(true);
}

/** open the import panel on the text tab, paste `text` and press Import */
async function importText(text: string) {
  app.click('#bImport');
  app.click('[data-import="text"]');
  app.setValue('#importText', text);
  app.click('#bDoImport');
  await until(() => /已匯入文字|沒有可匯入/.test(toast() ?? ''));
  await app.settle();
}

async function exported(format: string, mode?: string) {
  if (mode) app.click(`[data-mode="${mode}"]`);
  app.click('#bCopy');
  await app.settle();
  app.copied.length = 0;
  app.copy(format);
  await app.frames(2);
  return app.copied.join('');
}

/** a solid-colour PNG of the given size, as a File that belongs to the app's window */
async function pngFile(w: number, h: number, color = '#ff0000', name = 'a.png') {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  const blob = await new Promise<Blob>((res, rej) =>
    c.toBlob((b) => (b ? res(b) : rej(new Error('no blob'))), 'image/png'),
  );
  return new app.win.File([blob], name, { type: 'image/png' });
}

function transfer(...files: File[]): DataTransfer {
  const dt = new app.win.DataTransfer();
  files.forEach((f) => dt.items.add(f));
  return dt;
}

async function pickImage(file: File) {
  const input = app.q<HTMLInputElement>('#fileImage');
  input.files = transfer(file).files;
  input.dispatchEvent(new app.win.Event('change', { bubbles: true }));
  await until(() => /已匯入圖片|無法讀取|太大/.test(toast() ?? ''));
  await app.settle();
}

describe('import panel', () => {
  it('opens and closes, keeps the canvas size, and shuts the export panel', async () => {
    const before = meta();
    app.click('#bCopy');
    await app.settle();
    expect(app.q('#copyMenu').hidden).toBe(false);
    app.click('#bImport');
    await app.settle();
    expect(app.q('#importMenu').hidden).toBe(false);
    expect(app.q('#bImport').getAttribute('aria-expanded')).toBe('true');
    expect(app.q('#copyMenu').hidden).toBe(true);
    expect(app.q('#bCopy').getAttribute('aria-expanded')).toBe('false');
    expect(meta()).toBe(before);
    app.click('#bCopy');
    await app.settle();
    expect(app.q('#importMenu').hidden).toBe(true);
    expect(app.q('#copyMenu').hidden).toBe(false);
    app.click('#bCopy');
    app.click('#bImport');
    await app.settle();
    app.click('#bImport');
    await app.settle();
    expect(app.q('#importMenu').hidden).toBe(true);
    expect(meta()).toBe(before);
  });

  it('switches between the image and text panes', async () => {
    app.click('#bImport');
    await app.settle();
    expect(pressed('[data-import="image"]')).toBe('true');
    expect(app.q('#importTextPane').hidden).toBe(true);
    app.click('[data-import="text"]');
    expect(pressed('[data-import="text"]')).toBe('true');
    expect(pressed('[data-import="image"]')).toBe('false');
    expect(app.q('#importImagePane').hidden).toBe(true);
    expect(app.q('#importTextPane').hidden).toBe(false);
  });
});

describe('text import', () => {
  const ART = '⣿⣿⣿⡇⠀⣿\n⢸⡇⣀⣤⠶⠛\n⠁⠂⠄⡀⢀⠠';

  it('sizes the grid to the text and reproduces it in braille mode', async () => {
    await importText(ART);
    expect(meta()).toBe('8 × 4 cells'); // 6 × 3 padded up to the grid minimum
    expect(app.q('#importMenu').hidden).toBe(true);
    expect(toast()).toBe('已匯入文字（8 × 4）');
    expect((await exported('text', 'braille')).split('\n')).toEqual(ART.split('\n'));
  });

  it('reproduces block characters in block mode', async () => {
    const blocks = '█▀▄▌▐▘▝▖▗\n▛▜▙▟▚▞▀▀▀';
    await importText(blocks);
    expect((await exported('text', 'block')).split('\n')).toEqual(blocks.split('\n'));
  });

  it('paints in the pen colour', async () => {
    app.click('[data-color="#da1e28"]');
    await importText(ART);
    expect(await exported('ansi', 'braille')).toContain('\x1b[38;2;218;30;40m');
  });

  it('draws ordinary and wide characters in their own cells', async () => {
    await importText('M中M\nMMMM');
    const rows = (await exported('text', 'braille')).split('\n');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveLength(4); // M, the two halves of 中, M
    expect(rows[1]).toHaveLength(4);
    expect([...rows[1]].every((c) => c !== '\u2800')).toBe(true);
  });

  it('can be undone back to the old canvas and grid', async () => {
    const before = meta();
    app.click('[data-mode="braille"]');
    app.setValue('#size', '6');
    const v = app.view.getBoundingClientRect();
    app.stroke(line(v.width * 0.2, v.height * 0.5, v.width * 0.8, v.height * 0.5, 12));
    await app.frames(3);
    const drawn = await exported('text');
    app.click('#bCopy'); // close the export panel
    await importText(ART);
    expect(meta()).not.toBe(before);
    app.click('#bUndo');
    await app.settle();
    expect(meta()).toBe(before);
    app.click('#bCopy');
    await app.settle();
    expect(await exported('text')).toBe(drawn);
  });

  it('ignores the erase mode', async () => {
    app.click('#tErase');
    await importText(ART);
    expect((await exported('text', 'braille')).split('\n')).toEqual(ART.split('\n'));
  });

  it('cuts text that is too big and says so', async () => {
    await importText('x'.repeat(300));
    expect(toast()).toBe('已匯入文字，已裁切到 200 × 4');
    expect(meta()).toBe('200 × 4 cells');
  });

  it('says so when there is nothing to import, and changes nothing', async () => {
    const before = meta();
    await importText('  \n \n');
    expect(toast()).toBe('沒有可匯入的文字');
    expect(meta()).toBe(before);
    expect(app.q('#importMenu').hidden).toBe(false);
  });

  it('reads a text file', async () => {
    app.click('#bImport');
    const input = app.q<HTMLInputElement>('#fileText');
    const file = new app.win.File([ART], 'art.txt', { type: 'text/plain' });
    input.files = transfer(file).files;
    input.dispatchEvent(new app.win.Event('change', { bubbles: true }));
    await until(() => /已匯入文字/.test(toast() ?? ''));
    await app.settle();
    expect((await exported('text', 'braille')).split('\n')).toEqual(ART.split('\n'));
  });
});

describe('image import', () => {
  it('draws the picture in its own colours and keeps the grid', async () => {
    const before = meta();
    app.click('#bImport');
    await pickImage(await pngFile(60, 60));
    expect(toast()).toBe('已匯入圖片');
    expect(meta()).toBe(before);
    expect(app.q('#importMenu').hidden).toBe(true);
    expect(await exported('ansi', 'braille')).toContain('\x1b[38;2;255;0;0m');
  });

  it('shows the whole picture centred, leaving the rest blank', async () => {
    await pickImage(await pngFile(20, 400));
    const lines = (await exported('text', 'block')).split('\n');
    const cols = Number(meta()?.split(' ')[0]);
    expect(Math.max(...lines.map((l) => l.length))).toBeLessThan(cols / 4);
    expect(lines.length).toBeGreaterThan(5);
  });

  it('replaces what was there and can be undone', async () => {
    app.click('[data-mode="braille"]');
    app.setValue('#size', '6');
    const v = app.view.getBoundingClientRect();
    app.stroke(line(v.width * 0.2, v.height * 0.5, v.width * 0.8, v.height * 0.5, 12));
    await app.frames(3);
    const drawn = await exported('text');
    app.click('#bCopy');
    await pickImage(await pngFile(40, 40, '#0000ff'));
    expect(await exported('text', 'block')).not.toBe(drawn);
    app.click('#bUndo');
    await app.settle();
    expect(await exported('text', 'braille')).toBe(drawn);
  });

  it('refuses a broken picture without touching the canvas or the history', async () => {
    app.click('[data-mode="braille"]');
    app.setValue('#size', '6');
    const v = app.view.getBoundingClientRect();
    app.stroke(line(v.width * 0.2, v.height * 0.5, v.width * 0.8, v.height * 0.5, 12));
    await app.frames(3);
    const drawn = await exported('text');
    app.click('#bCopy');
    await pickImage(new app.win.File(['not a picture'], 'bad.png', { type: 'image/png' }));
    expect(toast()).toBe('無法讀取圖片');
    app.click('#bUndo'); // undoes the stroke, not an empty step left by the failed import
    await app.settle();
    app.click('#bCopy');
    app.copied.length = 0;
    app.copy('text');
    await app.frames(2);
    expect(app.copied.join('')).not.toBe(drawn);
    expect(toast()).toBe('畫布是空的');
  });
});

describe('drop and paste', () => {
  it('imports a picture dropped on the canvas, with a frame while dragging', async () => {
    const file = await pngFile(40, 40);
    const dt = transfer(file);
    const stage = app.q('#stage');
    stage.dispatchEvent(new app.win.DragEvent('dragenter', { dataTransfer: dt, bubbles: true }));
    expect(stage.classList.contains('dropping')).toBe(true);
    const over = new app.win.DragEvent('dragover', {
      dataTransfer: dt,
      bubbles: true,
      cancelable: true,
    });
    stage.dispatchEvent(over);
    expect(over.defaultPrevented).toBe(true);
    stage.dispatchEvent(
      new app.win.DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }),
    );
    expect(stage.classList.contains('dropping')).toBe(false);
    await until(() => toast() === '已匯入圖片');
    await app.settle();
    expect(await exported('ansi', 'braille')).toContain('\x1b[38;2;255;0;0m');
  });

  it('imports a dropped text file and rejects other files', async () => {
    const stage = app.q('#stage');
    const drop = (f: File) =>
      stage.dispatchEvent(
        new app.win.DragEvent('drop', {
          dataTransfer: transfer(f),
          bubbles: true,
          cancelable: true,
        }),
      );
    drop(new app.win.File(['⣿⣿⣿⣿'], 'x.ans', { type: '' }));
    await until(() => /已匯入文字/.test(toast() ?? ''));
    drop(new app.win.File(['zip'], 'x.zip', { type: 'application/zip' }));
    await until(() => toast() === '不支援的檔案');
  });

  it('ignores drags that carry no files', () => {
    const over = new app.win.DragEvent('dragover', { bubbles: true, cancelable: true });
    app.q('#stage').dispatchEvent(over);
    expect(over.defaultPrevented).toBe(false);
  });

  it('imports a pasted picture, but leaves pasting into a text field alone', async () => {
    const file = await pngFile(40, 40);
    const field = new app.win.ClipboardEvent('paste', {
      clipboardData: transfer(file),
      bubbles: true,
      cancelable: true,
    });
    app.q('#importText').dispatchEvent(field);
    expect(field.defaultPrevented).toBe(false);
    const paste = new app.win.ClipboardEvent('paste', {
      clipboardData: transfer(file),
      bubbles: true,
      cancelable: true,
    });
    app.doc.body.dispatchEvent(paste);
    expect(paste.defaultPrevented).toBe(true);
    await until(() => toast() === '已匯入圖片');
  });
});
