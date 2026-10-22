import { $ } from '../dom';
import { isOpen, reveal } from './reveal';

export type MenuName = 'import' | 'export';

const MENUS: Record<MenuName, { button: string; panel: string; label: string }> = {
  import: { button: 'bImport', panel: 'importMenu', label: '匯入' },
  export: { button: 'bCopy', panel: 'copyMenu', label: '匯出' },
};
const OPEN_LABEL = '取消';

/**
 * Open one of the two tray menus (or none). Only one is ever open; each button says what it does
 * next — its own name while its menu is shut, 取消 while it is open — and `aria-expanded` follows.
 * Every open and close goes through here, so the labels cannot go stale: switching straight to the
 * other menu, finishing an action and pressing the same button again all end up consistent.
 */
export function setMenu(open: MenuName | null): void {
  for (const name of Object.keys(MENUS) as MenuName[]) {
    const { button, panel, label } = MENUS[name],
      show = name === open,
      btn = $(button);
    reveal($(panel), show, 'collapse');
    btn.textContent = show ? OPEN_LABEL : label;
    btn.setAttribute('aria-expanded', String(show));
  }
}

export const toggleMenu = (name: MenuName): void =>
  setMenu(isOpen($(MENUS[name].panel)) ? null : name);

/** Close `name` (after a copy, download or import finished), unless the user already moved on. */
export function closeMenu(name: MenuName): void {
  if (isOpen($(MENUS[name].panel))) setMenu(null);
}
