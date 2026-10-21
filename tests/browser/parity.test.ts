// Drives the original single-file app (legacy/) and the refactored app (/) through the same
// inputs and demands byte-identical clipboard output and identical canvas pixels.
import { describe, expect, it } from 'vitest';
import { line, openApp } from './harness';

const MODES = ['mix', 'braille', 'block', 'shade', 'dots', 'cjk', 'line', 'custom'];
const KINDS = ['text', 'html', 'ansi'];
const SPACES = [' ', ' ', '⠀'];
// every glyph the converters may measure, so lazily-loaded font subsets are in place before drawing
const GLYPHS =
  ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~' +
  '░▒▓█▀▄▌▐▖▗▘▝▚▞▙▛▜▟·•●丶一二三工王田目回国國圖龍鬱龘';

const hash = (s: string): string => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16) + ':' + s.length;
};

/** Height of the canvas area (#stage) when the page is shown in an iframe of the given height. */
async function stageHeightAt(url: string, iframeHeight: number): Promise<number> {
  const app = await openApp(url, 480, iframeHeight);
  const h = Math.floor(app.q('#stage').getBoundingClientRect().height);
  app.close();
  return h;
}

/** Drive one app through the scenario; returns every captured output and the canvas-area height. */
async function collect(
  url: string,
  iframeHeight = 720,
): Promise<{ out: Record<string, string>; stageHeight: number }> {
  const app = await openApp(url, 480, iframeHeight);
  const { iframe, win, doc, view, copied, frames, sleep, click, setValue, stroke } = app;
  const stageH = () => Math.floor(app.q('#stage').getBoundingClientRect().height);

  // wait for fonts and the starter picture, then settle glyph calibration on the loaded fonts
  await win.document.fonts.load('13px "IBM Plex Mono"', GLYPHS);
  await frames();
  await sleep(300);
  const resizeCycle = async () => {
    iframe.style.width = '481px';
    await frames();
    iframe.style.width = '480px';
    await frames();
  };
  await resizeCycle();

  const out: Record<string, string> = {};
  const capture = async (label: string) => {
    await frames();
    for (const kind of KINDS) {
      copied.length = 0;
      click(`[data-copy="${kind}"]`);
      out[`${label}/${kind}`] = copied.join('\u0000');
    }
    out[`${label}/pixels`] = hash(view.toDataURL());
  };

  await capture('initial');

  // a few strokes: default ink, colours, picker, thick pen, eraser
  stroke(line(40, 40, 440, 70));
  click('[data-color="#da1e28"]');
  setValue('#size', '14');
  stroke(line(60, 300, 240, 100));
  click('[data-color="#0f62fe"]');
  setValue('#size', '6');
  stroke(
    Array.from({ length: 25 }, (_, i): [number, number] => [
      300 + 80 * Math.cos((i / 24) * Math.PI * 2),
      200 + 80 * Math.sin((i / 24) * Math.PI * 2),
    ]),
  );
  setValue('#colorPick', '#ee5396');
  stroke(line(100, 330, 200, 345, 6));
  setValue('#colorPick', '#000000'); // the picker nudges pure black off theme ink
  stroke(line(250, 330, 350, 345, 6));
  click('#tErase');
  setValue('#size', '30');
  stroke(line(200, 150, 280, 250));
  click('#bUndo');
  click('#bRedo');
  setValue('#size', '5');

  for (const theme of ['light', 'dark']) {
    doc.documentElement.dataset.theme = theme;
    for (const palette of ['color', 'gray']) {
      click(`[data-palette="${palette}"]`);
      for (const mode of MODES) {
        click(`[data-mode="${mode}"]`);
        if (mode === 'custom') setValue('#customChars', ' .:oO@#');
        await capture(`${theme}/${palette}/${mode}`);
      }
    }
  }

  // pen-trace underlay and every whitespace substitute, with and without a code fence
  doc.documentElement.dataset.theme = 'light';
  click('[data-palette="color"]');
  click('#bUnder');
  for (const mode of ['mix', 'braille', 'block']) {
    click(`[data-mode="${mode}"]`);
    await capture(`under/${mode}`);
  }
  click('#bUnder');
  click('[data-mode="mix"]');
  for (const fence of [false, true]) {
    if (fence) click('#bFence');
    for (const sp of SPACES) {
      click(`[data-space="${sp}"]`);
      await capture(`space/${fence ? 'fence' : 'plain'}/${sp.charCodeAt(0).toString(16)}`);
    }
  }

  const result = { out, stageHeight: stageH() };
  iframe.remove();
  return result;
}

describe('refactored app matches the original single-file app', () => {
  it('produces identical output for every mode, palette, theme and copy format', async () => {
    const current = await collect('/index.html');
    // the refactored page has an extra tray row; give the legacy page's canvas the same area
    const legacyH = 720 + current.stageHeight - (await stageHeightAt('/legacy/index.html', 720));
    const legacy = await collect('/legacy/index.html', legacyH);
    expect(legacy.stageHeight).toBe(current.stageHeight);
    expect(Object.keys(current.out)).toEqual(Object.keys(legacy.out));
    // sanity: the scenario really drew something
    expect(legacy.out['initial/text'].length).toBeGreaterThan(50);
    const differing = Object.keys(legacy.out).filter((k) => legacy.out[k] !== current.out[k]);
    expect(differing).toEqual([]);
  }, 180_000);
});
