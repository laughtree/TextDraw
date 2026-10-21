import { isOpen, reveal } from './reveal';

let open: { close: () => void } | null = null;

/**
 * Click-to-toggle help bubble: the button opens and closes it, a click elsewhere or Esc closes it,
 * and opening one bubble closes any other that is open.
 */
export function bindTip(button: HTMLElement, tip: HTMLElement): { close: () => void } {
  const self = { close: () => set(false) };
  function set(show: boolean): void {
    if (show && open && open !== self) open.close();
    reveal(tip, show, 'rise');
    button.setAttribute('aria-expanded', String(show));
    if (show) open = self;
    else if (open === self) open = null;
  }
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    set(!isOpen(tip));
  });
  document.addEventListener('click', (e) => {
    if (isOpen(tip) && !tip.contains(e.target as Node)) set(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') set(false);
  });
  return self;
}
