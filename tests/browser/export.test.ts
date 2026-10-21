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

const MODES = ['braille', 'mix', 'block', 'shade', 'dots', 'cjk', 'line', 'custom'];
const toast = () => app.q('#toast').textContent;
const formats = () => [...app.doc.querySelectorAll<HTMLElement>('[data-format]')];

/** a stroke across the middle in the given swatch colour */
async function drawLine(color = '#da1e28', mode = 'braille') {
  app.click(`[data-color="${color}"]`);
  app.click(`[data-mode="${mode}"]`);
  app.setValue('#size', '6');
  const v = app.view.getBoundingClientRect();
  app.stroke(line(v.width * 0.2, v.height * 0.5, v.width * 0.8, v.height * 0.5, 12));
  await app.frames(3);
}

async function until(cond: () => boolean, ms = 3000) {
  for (let t = 0; t < ms && !cond(); t += 25) await app.sleep(25);
  expect(cond(), 'condition met in time').toBe(true);
}

async function decode(blob: Blob) {
  const bmp = await createImageBitmap(blob);
  const c = document.createElement('canvas');
  c.width = bmp.width;
  c.height = bmp.height;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  ctx.drawImage(bmp, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  /** the colour of the first fully opaque pixel, or null */
  let ink: [number, number, number] | null = null;
  let opaque = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 250) {
      opaque++;
      ink ??= [data[i - 3], data[i - 2], data[i - 1]];
    }
  }
  return { w: c.width, h: c.height, alpha0: data[3], opaque, ink };
}

describe('export menu', () => {
  it('is called Export and lists four formats with Copy and Download', () => {
    expect(app.q('#bCopy').textContent?.trim()).toBe('匯出');
    expect(formats().map((b) => b.dataset.format)).toEqual(['text', 'html', 'ansi', 'image']);
    expect(formats().map((b) => b.textContent?.trim())).toEqual([
      '純文字',
      '彩色 HTML',
      'ANSI',
      '圖片',
    ]);
    expect(app.q('#bDoCopy').textContent?.trim()).toBe('複製');
    expect(app.q('#bDoDownload').textContent?.trim()).toBe('下載');
    expect(app.doc.querySelector('[data-copy]')).toBeNull();
  });

  it('keeps one format selected, plain text first', () => {
    expect(formats().map((b) => b.getAttribute('aria-pressed'))).toEqual([
      'true',
      'false',
      'false',
      'false',
    ]);
    formats()[3].click();
    expect(formats().map((b) => b.getAttribute('aria-pressed'))).toEqual([
      'false',
      'false',
      'false',
      'true',
    ]);
  });

  it('says the canvas is empty instead of copying or saving nothing', async () => {
    for (const f of ['text', 'html', 'ansi', 'image']) {
      for (const act of [app.copy, app.download]) {
        act(f);
        await app.frames(2);
        expect(toast(), f).toBe('畫布是空的');
      }
    }
    expect(app.copied.filter(Boolean)).toHaveLength(0);
    expect(app.downloads).toHaveLength(0);
    expect(app.images).toHaveLength(0);
  });
});

describe('text formats', () => {
  it('copies each one to the clipboard', async () => {
    await drawLine();
    for (const [format, needle] of [
      ['text', '⠶'],
      ['html', '<pre'],
      ['ansi', '\x1b[38;2;218;30;40m'],
    ]) {
      app.copied.length = 0;
      app.copy(format);
      expect(app.copied.join(''), format).toContain(needle);
    }
  });

  it('downloads each one as a file with the right name, type and content', async () => {
    await drawLine();
    for (const [format, name, mime, needle] of [
      ['text', 'ascii-paint.txt', 'text/plain;charset=utf-8', '⠶'],
      ['html', 'ascii-paint.html', 'text/html;charset=utf-8', '<meta charset="utf-8">'],
      ['ansi', 'ascii-paint.ans', 'text/plain;charset=utf-8', '\x1b[38;2;218;30;40m'],
    ]) {
      app.download(format);
      const file = app.downloads[app.downloads.length - 1];
      expect(file.name, format).toBe(name);
      expect(file.blob.type, format).toBe(mime);
      expect(await file.blob.text(), format).toContain(needle);
      expect(toast(), format).toBe(`已下載 ${name}`);
    }
  });

  it('saves HTML as a whole document and text exactly as it would be copied', async () => {
    await drawLine();
    app.download('html');
    const html = await app.downloads[0].blob.text();
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<pre');
    app.copied.length = 0;
    app.copy('text');
    app.download('text');
    expect(await app.downloads[1].blob.text()).toBe(app.copied.join(''));
  });

  it('closes the menu after copying or saving', async () => {
    await drawLine();
    app.click('#bCopy');
    await app.settle();
    app.copy('text');
    await until(() => app.q('#copyMenu').hidden === true);
    app.click('#bCopy');
    await app.settle();
    expect(app.q('#copyMenu').hidden).toBe(false);
    app.download('text');
    await until(() => app.q('#copyMenu').hidden === true);
  });

  it('warns about a platform limit only when copying plain text', async () => {
    const select = app.q<HTMLSelectElement>('#platform');
    select.value = 'instagram-bio'; // 150 characters
    select.dispatchEvent(new app.win.Event('change', { bubbles: true }));
    app.setValue('#inCols', '100', 'change');
    app.setValue('#inRows', '50', 'change');
    await app.settle();
    await drawLine('#da1e28', 'block');
    app.setValue('#size', '40');
    const v = app.view.getBoundingClientRect();
    for (let i = 0; i <= 10; i++)
      app.stroke(line(0, (v.height * i) / 10, v.width, (v.height * i) / 10, 8));
    await app.frames(3);
    app.copy('html');
    await app.frames(2);
    expect(toast()).toBe('已複製彩色 HTML');
    app.copy('text');
    await app.frames(2);
    expect(toast()).toMatch(/^已複製純文字，但超過 Instagram 簡介 上限/);
    app.download('text');
    expect(toast()).toBe('已下載 ascii-paint.txt');
  });
});

describe('image', () => {
  it('copies a PNG with a transparent background, cropped to the drawing, in the drawn colour', async () => {
    await drawLine('#da1e28');
    app.copy('image');
    await until(() => app.images.length === 1);
    const blob = app.images[0];
    expect(blob.type).toBe('image/png');
    expect([...new Uint8Array(await blob.slice(0, 4).arrayBuffer())]).toEqual([137, 80, 78, 71]);
    const png = await decode(blob);
    expect(png.alpha0).toBe(0); // the corner is transparent
    expect(png.opaque).toBeGreaterThan(20);
    expect(png.ink?.[0]).toBeGreaterThan(180); // red
    expect(png.ink?.[1]).toBeLessThan(80);
    // cropped: a line across 60 % of the canvas, so far narrower than the whole canvas at 2×
    expect(png.w).toBeLessThan(app.view.getBoundingClientRect().width * 2 * 0.8);
    expect(png.w).toBeGreaterThan(app.view.getBoundingClientRect().width * 2 * 0.4);
    expect(toast()).toBe('已複製圖片');
  });

  it('draws the theme ink dark on light and light on dark', async () => {
    await drawLine('#000000');
    app.doc.documentElement.dataset.theme = 'light';
    await app.frames(3);
    app.copy('image');
    await until(() => app.images.length === 1);
    const light = await decode(app.images[0]);
    expect(light.ink?.every((c) => c < 60)).toBe(true);
    app.doc.documentElement.dataset.theme = 'dark';
    await app.frames(3);
    app.copy('image');
    await until(() => app.images.length === 2);
    const dark = await decode(app.images[1]);
    expect(dark.ink?.every((c) => c > 200)).toBe(true);
    expect(dark.alpha0).toBe(0);
  });

  it('downloads the PNG under its own name', async () => {
    await drawLine();
    app.download('image');
    await until(() => app.downloads.length === 1);
    expect(app.downloads[0].name).toBe('ascii-paint.png');
    expect(app.downloads[0].blob.type).toBe('image/png');
    expect(toast()).toBe('已下載 ascii-paint.png');
  });

  it('saves a file instead when the browser cannot copy images', async () => {
    Object.defineProperty(app.win, 'ClipboardItem', { configurable: true, value: undefined });
    await drawLine();
    app.copy('image');
    await until(() => app.downloads.length === 1);
    expect(app.downloads[0].name).toBe('ascii-paint.png');
    expect(app.images).toHaveLength(0);
    expect(toast()).toBe('瀏覽器不支援圖片複製，已改為下載');
  });

  it('saves a file instead when the clipboard refuses the image', async () => {
    Object.defineProperty(app.win.navigator.clipboard, 'write', {
      configurable: true,
      value: () => Promise.reject(new Error('blocked')),
    });
    await drawLine();
    app.copy('image');
    await until(() => app.downloads.length === 1);
    expect(toast()).toBe('瀏覽器不支援圖片複製，已改為下載');
  });

  it('renders every conversion mode, drawn the same way as on screen', async () => {
    for (const mode of MODES) {
      app.click('#bClear');
      await drawLine('#0f62fe', mode);
      const before = app.images.length;
      app.copy('image');
      await until(() => app.images.length === before + 1);
      const png = await decode(app.images[before]);
      expect(png.opaque, mode).toBeGreaterThan(10);
      expect(png.alpha0, mode).toBe(0);
    }
  });
});

describe('whitespace substitute', () => {
  const SPACES: [string, string, string][] = [
    ['標準', ' ', '[data-space=" "]'],
    ['不斷行', '\u00a0', '[data-space="\u00a0"]'],
    ['點字', '\u2800', '[data-space="\u2800"]'],
  ];

  /** a shape with blank cells in the middle and an indented first row, in braille mode */
  async function drawShape() {
    app.click('[data-mode="braille"]');
    app.click('[data-color="#0f62fe"]');
    app.click('[data-tool="rect"]');
    app.setValue('#size', '5');
    const v = app.view.getBoundingClientRect();
    app.stroke(line(v.width * 0.3, v.height * 0.3, v.width * 0.7, v.height * 0.7, 8));
    await app.frames(3);
  }

  const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');
  const visible = (format: string, text: string) =>
    format === 'ansi' ? text.replace(ANSI, '') : text.replace(/<[^>]*>/g, '');

  it.each(SPACES)('writes %s blanks into the text, HTML and ANSI exports', async (_n, ch, sel) => {
    await drawShape();
    app.click(sel);
    for (const format of ['text', 'html', 'ansi']) {
      app.copied.length = 0;
      app.copy(format);
      const body = visible(format, app.copied.join(''));
      // every character in the picture is a braille dot pattern or the chosen blank
      const chars = [...body.replace(/^<pre[^>]*>|<\/pre>$/g, '').replace(/\n/g, '')];
      expect(chars.length, format).toBeGreaterThan(20);
      for (const c of chars) {
        expect(
          c === ch || (c >= '\u2801' && c <= '\u28ff'),
          `${format}: ${JSON.stringify(c)}`,
        ).toBe(true);
      }
      expect(chars.includes(ch), `${format} has blank cells`).toBe(true);
    }
  });

  it('changes the exports when the substitute is changed, and only in the blank cells', async () => {
    await drawShape();
    const exported = () => {
      app.copied.length = 0;
      app.copy('text');
      return app.copied.join('');
    };
    app.click('[data-space=" "]');
    const standard = exported();
    app.click('[data-space="\u2800"]');
    const braille = exported();
    expect(braille).not.toBe(standard);
    expect(braille.replaceAll('\u2800', ' ')).toBe(standard);
    app.click('[data-space="\u00a0"]');
    expect(exported().replaceAll('\u00a0', ' ')).toBe(standard);
  });
});
