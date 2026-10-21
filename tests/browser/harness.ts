// Loads an app page in an iframe and drives it with synthetic input.

export interface App {
  iframe: HTMLIFrameElement;
  win: Window & typeof globalThis;
  doc: Document;
  view: HTMLCanvasElement;
  /** text handed to navigator.clipboard.writeText since the array was last emptied */
  copied: string[];
  q: <T extends HTMLElement>(sel: string) => T;
  frames: (n?: number) => Promise<void>;
  sleep: (ms: number) => Promise<void>;
  /** wait until every running animation (enter/exit motion, transitions) has finished */
  settle: () => Promise<void>;
  /** number of animations running right now */
  animations: () => number;
  click: (sel: string) => void;
  /** set an input's value and fire `input` (default) or `change` */
  setValue: (sel: string, value: string, event?: 'input' | 'change') => void;
  /** dispatch a pointer event at (x, y) in canvas coordinates */
  fire: (type: string, x: number, y: number, init?: PointerEventInit) => void;
  stroke: (pts: [number, number][]) => void;
  close: () => void;
}

export async function openApp(url: string, width = 480, height = 720): Promise<App> {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = `width:${width}px;height:${height}px;border:0`;
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
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  const animations = () => doc.getAnimations().length;
  const settle = async () => {
    for (let i = 0; i < 20 && animations() > 0; i++) {
      await Promise.allSettled(doc.getAnimations().map((a) => a.finished));
      await frames(1);
    }
    await frames(2);
  };
  const click = (sel: string) => q(sel).click();
  const setValue = (sel: string, value: string, event: 'input' | 'change' = 'input') => {
    const el = q<HTMLInputElement>(sel);
    el.value = value;
    el.dispatchEvent(new win.Event(event, { bubbles: true }));
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

  const view = q<HTMLCanvasElement>('#view');
  view.setPointerCapture = () => {}; // synthetic pointers are not "active"
  const fire = (type: string, x: number, y: number, init: PointerEventInit = {}) => {
    const r = view.getBoundingClientRect();
    const ev = new win.PointerEvent(type, {
      clientX: r.left + x,
      clientY: r.top + y,
      pointerId: 1,
      bubbles: true,
      cancelable: true,
      ...init,
    });
    Object.defineProperty(ev, 'getCoalescedEvents', { value: () => [ev] }); // untrusted events have none
    view.dispatchEvent(ev);
  };
  const stroke = (pts: [number, number][]) => {
    fire('pointerdown', ...pts[0]);
    for (const p of pts.slice(1)) fire('pointermove', ...p);
    fire('pointerup', ...pts[pts.length - 1]);
  };

  return {
    iframe,
    win,
    doc,
    view,
    copied,
    q,
    frames,
    sleep,
    settle,
    animations,
    click,
    setValue,
    fire,
    stroke,
    close: () => iframe.remove(),
  };
}

export const line = (x0: number, y0: number, x1: number, y1: number, n = 12): [number, number][] =>
  Array.from({ length: n + 1 }, (_, i) => [x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]);
