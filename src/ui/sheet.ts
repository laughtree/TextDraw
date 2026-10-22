import { $ } from '../dom';
import { t } from '../i18n';
import { SHEET_QUERY } from '../panels';
import { EASE, HIDE_MS, SHOW_MS } from './reveal';

/** Drag distance (px) of the handle that counts as a swipe. */
const SWIPE = 24;

/**
 * On short screens (panels.ts SHEET_QUERY) the tool tray is a bottom sheet: collapsed it shows a
 * handle and the two most-used rows, expanded it covers the canvas (never resizes it) up to 85 % of
 * the screen and scrolls inside. Tapping the canvas, Escape or a downward swipe closes it.
 */
export function initSheet(): void {
  const tray = $('tray'),
    handle = $('sheetHandle'),
    work = tray.parentElement as HTMLElement,
    tools = tray.querySelector<HTMLElement>('.tools'),
    toprow = tray.querySelector<HTMLElement>('.toprow'),
    stage = $('stage'),
    mq = matchMedia(SHEET_QUERY),
    reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!tools || !toprow) return;
  let anim: Animation | null = null;

  const isOpen = () => tray.dataset.sheet === 'open';

  const label = () => handle.setAttribute('aria-label', t(isOpen() ? 'sheet.close' : 'sheet.open'));
  document.addEventListener('langchange', label);

  const setState = (open: boolean) => {
    tray.dataset.sheet = open ? 'open' : 'closed';
    handle.setAttribute('aria-expanded', String(open));
    label();
  };

  /** Height of the collapsed sheet: everything down to the bottom of the shape row, plus padding. */
  const measure = () => {
    if (!mq.matches) return;
    const cs = getComputedStyle(tray),
      peek = tools.offsetTop + tools.offsetHeight + (parseFloat(cs.paddingBottom) || 0);
    work.style.setProperty('--peek', `${Math.ceil(peek)}px`);
    tray.style.setProperty('--peek', `${Math.ceil(peek)}px`);
  };

  const peek = () => parseFloat(tray.style.getPropertyValue('--peek')) || 0;

  const finish = () => {
    anim?.cancel();
    anim = null;
  };

  function toggle(open: boolean): void {
    if (!mq.matches || open === isOpen()) return;
    const from = tray.getBoundingClientRect().height;
    finish();
    setState(open);
    if (!open) tray.scrollTop = 0;
    if (reduced.matches) return;
    const to = open ? tray.getBoundingClientRect().height : peek();
    if (Math.abs(to - from) < 1) return;
    tray.style.overflow = 'hidden';
    anim = tray.animate([{ maxHeight: `${from}px` }, { maxHeight: `${to}px` }], {
      duration: open ? SHOW_MS : HIDE_MS,
      easing: EASE,
    });
    const mine = anim;
    mine.onfinish = mine.oncancel = () => {
      if (anim === mine) anim = null;
      tray.style.overflow = '';
    };
  }

  handle.onclick = () => {
    if (!dragged) toggle(!isOpen());
    dragged = false;
  };

  let dragged = false,
    startY: number | null = null;
  handle.addEventListener('pointerdown', (e) => {
    startY = e.clientY;
    dragged = false;
    try {
      handle.setPointerCapture(e.pointerId);
    } catch {
      // not an active pointer (synthetic events): the swipe still works without capture
    }
  });
  handle.addEventListener('pointermove', (e) => {
    if (startY === null) return;
    const dy = e.clientY - startY;
    if (Math.abs(dy) < SWIPE) return;
    dragged = true;
    startY = null;
    toggle(dy < 0);
  });
  const endDrag = () => {
    startY = null;
  };
  handle.addEventListener('pointerup', endDrag);
  handle.addEventListener('pointercancel', endDrag);

  // a tap on the canvas closes the sheet and does not start a stroke
  stage.addEventListener(
    'pointerdown',
    (e) => {
      if (!mq.matches || !isOpen()) return;
      e.stopPropagation();
      e.preventDefault();
      toggle(false);
    },
    true,
  );
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mq.matches && isOpen() && !(e.target instanceof HTMLInputElement))
      toggle(false);
  });

  const apply = () => {
    finish();
    tray.style.overflow = '';
    if (mq.matches) {
      setState(false);
      measure();
    } else {
      delete tray.dataset.sheet;
      handle.setAttribute('aria-expanded', 'false');
      work.style.removeProperty('--peek');
      tray.style.removeProperty('--peek');
    }
  };
  mq.addEventListener('change', apply);
  window.addEventListener('resize', measure);
  const ro = new ResizeObserver(() => {
    if (!isOpen()) measure();
  });
  ro.observe(tools);
  ro.observe(toprow);
  void document.fonts.ready.then(measure);
  apply();
}
