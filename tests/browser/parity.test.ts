// Drives the original single-file app (legacy/) and the refactored app (/) through the same
// inputs and demands byte-identical clipboard output and identical canvas pixels.
import { describe, expect, it } from 'vitest';
import { line, openApp } from './harness';

// 'mix' and 'block' are left out on purpose: their character sets were redesigned after the
// refactor (blocks + braille only, eighth blocks), so they intentionally differ from legacy/.
const MODES = ['braille', 'shade', 'dots', 'cjk', 'line', 'custom'];
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
  const legacy = url.includes('/legacy/');
  const { iframe, win, doc, view, copied, frames, sleep, settle, click, setValue, stroke } = app;
  const stageH = () => Math.floor(app.q('#stage').getBoundingClientRect().height);
  // The page declares lang=zh-Hant, which makes the canvas pick Traditional-Chinese glyph forms for
  // CJK text; the frozen legacy page has no lang, so give it the same one before anything is drawn.
  if (legacy) doc.documentElement.lang = 'zh-Hant';

  // The refactored page keeps the canvas as it is when a panel opens over it; the legacy page
  // shrinks its stage (cropping the painting for good) when the custom-characters row appears.
  // So legacy gets a taller window while that row is showing, which keeps its canvas the same size.
  const CUSTOM_ROW = 48; // the row's 40 px plus the 8 px gap
  let customOpen = false;
  const resizeBy = async (dy: number) => {
    iframe.style.height = `${parseFloat(iframe.style.height) + dy}px`;
    await frames(3);
  };
  const selectMode = async (mode: string) => {
    if (legacy && mode === 'custom' && !customOpen) {
      const before = stageH();
      await resizeBy(CUSTOM_ROW); // grow first, so the extra rows are blank and nothing is lost
      click('[data-mode="custom"]');
      await frames(3);
      if (stageH() !== before) throw new Error('legacy canvas changed size with the custom row');
      customOpen = true;
      return;
    }
    click(`[data-mode="${mode}"]`);
    if (legacy && mode !== 'custom' && customOpen) {
      await frames(3);
      await resizeBy(-CUSTOM_ROW);
      customOpen = false;
    }
  };

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
    await settle(); // the refactored page animates panels in and out; legacy has none
    for (const kind of KINDS) {
      copied.length = 0;
      if (legacy) click(`[data-copy="${kind}"]`);
      else app.copy(kind); // the refactored page picks a format, then presses Copy
      let text = copied.join('\u0000');
      // Legacy writes blank cells into the HTML as plain spaces; the refactored page uses the chosen
      // whitespace substitute there too (on purpose). The substitutes never occur anywhere else,
      // so turning them back into spaces compares everything else strictly.
      if (kind === 'html' && !legacy)
        text = text.replaceAll('\u2800', ' ').replaceAll('\u00a0', ' ');
      out[`${label}/${kind}`] = text;
    }
    out[`${label}/pixels`] = hash(view.toDataURL());
  };

  // the starter pictures differ on purpose (legacy paints ASCII / PAINTER), so start both from blank
  click('#bClear');
  click('[data-mode="shade"]');
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
  // legacy's eraser is 2.5× the slider; the refactored one is as wide as the pen. 12 × 2.5 = 30,
  // so both erase 30 px wide.
  setValue('#size', legacy ? '12' : '30');
  stroke(line(200, 150, 280, 250));
  click('#bUndo');
  click('#bRedo');
  setValue('#size', '5');

  for (const theme of ['light', 'dark']) {
    doc.documentElement.dataset.theme = theme;
    for (const palette of ['color', 'gray']) {
      click(`[data-palette="${palette}"]`);
      for (const mode of MODES) {
        await selectMode(mode);
        if (mode === 'custom') setValue('#customChars', ' .:oO@#');
        await capture(`${theme}/${palette}/${mode}`);
      }
    }
  }

  // pen-trace underlay and every whitespace substitute, with and without a code fence
  doc.documentElement.dataset.theme = 'light';
  click('[data-palette="color"]');
  click('#bUnder');
  for (const mode of ['braille', 'shade']) {
    await selectMode(mode);
    await capture(`under/${mode}`);
  }
  click('#bUnder');
  click('[data-mode="shade"]');
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
    expect(legacy.out['light/color/cjk/text'].length).toBeGreaterThan(50);
    const differing = Object.keys(legacy.out).filter((k) => legacy.out[k] !== current.out[k]);
    expect(differing).toEqual([]);
  }, 180_000);
});
