// Drives the original single-file app (legacy/) and the refactored app (/) through the same
// inputs and demands byte-identical clipboard output and identical canvas pixels.
import { describe, expect, it } from 'vitest';

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

async function collect(url: string): Promise<Record<string, string>> {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:480px;height:720px;border:0';
  document.body.append(iframe);
  await new Promise<void>((resolve) => {
    iframe.addEventListener('load', () => resolve(), { once: true });
    iframe.src = url;
  });
  const win = iframe.contentWindow as Window & typeof globalThis;
  const doc = win.document;

  const q = <T extends HTMLElement>(sel: string): T => {
    const el = doc.querySelector<T>(sel);
    if (!el) throw new Error(`${url}: ${sel} not found`);
    return el;
  };
  const frames = async (n = 3) => {
    for (let i = 0; i < n; i++) await new Promise((r) => win.requestAnimationFrame(r));
  };
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const click = (sel: string) => q(sel).click();
  const setValue = (sel: string, value: string) => {
    const el = q<HTMLInputElement>(sel);
    el.value = value;
    el.dispatchEvent(new win.Event('input', { bubbles: true }));
  };

  const copied: string[] = [];
  Object.defineProperty(win.navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: (t: string) => {
        copied.push(t);
        return Promise.resolve();
      },
    },
  });

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

  const view = q<HTMLCanvasElement>('#view');
  view.setPointerCapture = () => {}; // synthetic pointers are not "active"
  const fire = (type: string, x: number, y: number) => {
    const r = view.getBoundingClientRect();
    const ev = new win.PointerEvent(type, {
      clientX: r.left + x,
      clientY: r.top + y,
      pointerId: 1,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(ev, 'getCoalescedEvents', { value: () => [ev] }); // untrusted events have none
    view.dispatchEvent(ev);
  };
  const stroke = (pts: [number, number][]) => {
    fire('pointerdown', ...pts[0]);
    for (const p of pts.slice(1)) fire('pointermove', ...p);
    fire('pointerup', ...pts[pts.length - 1]);
  };
  const line = (x0: number, y0: number, x1: number, y1: number, n = 12): [number, number][] =>
    Array.from({ length: n + 1 }, (_, i) => [x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]);

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

  iframe.remove();
  return out;
}

describe('refactored app matches the original single-file app', () => {
  it('produces identical output for every mode, palette, theme and copy format', async () => {
    const legacy = await collect('/legacy/index.html');
    const current = await collect('/index.html');
    expect(Object.keys(current)).toEqual(Object.keys(legacy));
    // sanity: the scenario really drew something
    expect(legacy['initial/text'].length).toBeGreaterThan(50);
    const differing = Object.keys(legacy).filter((k) => legacy[k] !== current[k]);
    expect(differing).toEqual([]);
  }, 180_000);
});
