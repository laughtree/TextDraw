import { $ } from '../dom';
import { reveal } from './reveal';

let timer: ReturnType<typeof setTimeout> | undefined;

export function toast(message: string): void {
  const el = $('toast');
  el.textContent = message;
  reveal(el, true, 'drop'); // already showing: only the text changed
  clearTimeout(timer);
  timer = setTimeout(() => reveal(el, false, 'drop'), 1800);
}
