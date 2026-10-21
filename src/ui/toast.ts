import { $ } from '../dom';

let timer: ReturnType<typeof setTimeout> | undefined;

export function toast(message: string): void {
  const el = $('toast');
  el.textContent = message;
  el.hidden = false;
  clearTimeout(timer);
  timer = setTimeout(() => (el.hidden = true), 1800);
}
