// Loads an app page in an iframe and drives it with synthetic input.

export interface App {
  iframe: HTMLIFrameElement;
  win: Window & typeof globalThis;
  doc: Document;
  view: HTMLCanvasElement;
  /** text handed to navigator.clipboard.writeText since the array was last emptied */
  copied: string[];
  /** images handed to navigator.clipboard.write */
  images: Blob[];
  /** files offered for download (<a download> clicks), in order */
  downloads: { name: string; blob: Blob }[];
  /** pick an export format in the menu, then press Copy */
  copy: (format: string) => void;
  /** pick an export format in the menu, then press Download */
  download: (format: string) => void;
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

export interface OpenOptions {
  /**
   * The app starts on a small fixed grid; by default the helper switches it to 滿版 (the whole
   * window) once the page is ready, which is the canvas most tests are written for.
   */
  full?: boolean;
}

export async function openApp(
  url: string,
  width = 480,
  height = 720,
  { full = true }: OpenOptions = {},
): Promise<App> {
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
  // endless animations (the text caret's blink) never finish, so they are not waited for
  const running = () =>
    doc.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity);
  const animations = () => running().length;
  const settle = async () => {
    for (let i = 0; i < 20 && animations() > 0; i++) {
      await Promise.allSettled(running().map((a) => a.finished));
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
  const images: Blob[] = [];
  Object.defineProperty(win.navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: (t: string) => {
        copied.push(t);
        return Promise.resolve();
      },
      write: async (items: ClipboardItem[]) => {
        for (const item of items) {
          for (const type of item.types) images.push(await item.getType(type));
        }
      },
    },
  });

  // downloads: remember each blob behind an object URL, and record the <a download> click
  // instead of letting the browser save a file
  const downloads: { name: string; blob: Blob }[] = [];
  const blobs = new Map<string, Blob>();
  const createObjectURL = win.URL.createObjectURL.bind(win.URL);
  win.URL.createObjectURL = (obj: Blob | MediaSource) => {
    const url = createObjectURL(obj);
    if (obj instanceof win.Blob) blobs.set(url, obj);
    return url;
  };
  // eslint-disable-next-line @typescript-eslint/unbound-method -- called back with the anchor as `this`
  const anchorClick = win.HTMLAnchorElement.prototype.click;
  win.HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    const blob = blobs.get(this.href);
    if (this.download && blob) downloads.push({ name: this.download, blob });
    else anchorClick.call(this);
  };
  const withFormat = (format: string, button: string) => {
    q(`[data-format="${format}"]`).click();
    q(button).click();
  };

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

  if (full && doc.getElementById('bAuto')) {
    // wait for the first layout, then leave the start-up grid (the legacy page has no such button)
    for (let i = 0; i < 100 && doc.getElementById('meta')?.textContent === '0 × 0 cells'; i++) {
      await sleep(25);
    }
    q('#bAuto').click();
    await frames(3);
  }

  return {
    iframe,
    win,
    doc,
    view,
    copied,
    images,
    downloads,
    copy: (format: string) => withFormat(format, '#bDoCopy'),
    download: (format: string) => withFormat(format, '#bDoDownload'),
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
