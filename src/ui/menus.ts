import { $ } from '../dom';
import { t, type Key } from '../i18n';
import { isOpen, reveal } from './reveal';

export type MenuName = 'import' | 'export';

const MENUS: Record<MenuName, { button: string; panel: string; label: Key }> = {
  import: { button: 'bImport', panel: 'importMenu', label: 'action.import' },
  export: { button: 'bCopy', panel: 'copyMenu', label: 'action.export' },
};

/** Show on each button what it does next: its own name while its menu is shut, 取消 / Cancel while open. */
function renderLabels(): void {
  for (const name of Object.keys(MENUS) as MenuName[]) {
    const { button, panel, label } = MENUS[name],
      show = isOpen($(panel)),
      btn = $(button);
    btn.textContent = t(show ? 'action.cancel' : label);
    btn.setAttribute('aria-expanded', String(show));
  }
}
document.addEventListener('langchange', renderLabels);

/**
 * Open one of the two tray menus (or none). Only one is ever open; each button says what it does
 * next and `aria-expanded` follows. Every open and close goes through here, so the labels cannot go
 * stale: switching straight to the other menu, finishing an action and pressing the same button
 * again all end up consistent.
 */
export function setMenu(open: MenuName | null): void {
  for (const name of Object.keys(MENUS) as MenuName[])
    reveal($(MENUS[name].panel), name === open, 'collapse');
  renderLabels();
}

export const toggleMenu = (name: MenuName): void =>
  setMenu(isOpen($(MENUS[name].panel)) ? null : name);

/** Close `name` (after a copy, download or import finished), unless the user already moved on. */
export function closeMenu(name: MenuName): void {
  if (isOpen($(MENUS[name].panel))) setMenu(null);
}
