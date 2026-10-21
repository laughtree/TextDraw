import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openApp, type App } from './harness';

let app: App;
beforeEach(async () => {
  app = await openApp('/index.html');
  await app.win.document.fonts.load('13px "IBM Plex Mono"', 'M');
  await app.frames();
  await app.sleep(300); // starter picture, converted once the font is in
  await app.frames();
});
afterEach(() => app.close());

const buttons = () => [...app.doc.querySelectorAll<HTMLElement>('[data-mode]')];

async function copyText() {
  app.copied.length = 0;
  app.click('#bCopy');
  app.click('[data-copy="text"]');
  await app.frames();
  return app.copied.join('');
}

describe('conversion mode', () => {
  it('lists braille first, and it is the one selected on load', () => {
    expect(buttons().map((b) => b.dataset.mode)).toEqual([
      'braille',
      'mix',
      'block',
      'shade',
      'dots',
      'cjk',
      'line',
      'custom',
    ]);
    expect(buttons().map((b) => b.getAttribute('aria-pressed'))).toEqual([
      'true',
      ...Array<string>(7).fill('false'),
    ]);
  });

  it('really converts to braille at start', async () => {
    const text = await copyText();
    expect(text.length).toBeGreaterThan(50);
    // braille cells (and the braille blank used for spaces) plus line breaks, nothing else
    expect(text.replace(/\n/g, '')).toMatch(/^[⠀-⣿]+$/);
  });

  it('switches to mix on click, which also uses block characters', async () => {
    app.click('[data-mode="mix"]');
    await app.frames(2);
    expect(buttons().map((b) => b.getAttribute('aria-pressed'))).toEqual([
      'false',
      'true',
      ...Array<string>(6).fill('false'),
    ]);
    const text = await copyText();
    expect(text).toMatch(/[▀-▟]/);
  });
});
