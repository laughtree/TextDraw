import { $ } from '../dom';
import { doRedo, doUndo, pushUndo } from '../history';
import { state } from '../state';
import { bctx } from '../surface';
import { refreshText } from '../text';
import type { Mode, Palette, Tool } from '../types';
import { t } from '../i18n';
import { initColors } from './colors';
import { reveal } from './reveal';
import { setErase, setTool } from './tools';
import { toast } from './toast';

/** Mark `active` as the pressed one among `buttons` (single-choice segmented control). */
function selectOne(buttons: HTMLElement[], active: HTMLElement): void {
  buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === active)));
}

function initTools(): void {
  document
    .querySelectorAll<HTMLElement>('button[data-tool]')
    .forEach((b) => (b.onclick = () => setTool(b.dataset.tool as Tool)));
  document
    .querySelectorAll<HTMLElement>('[data-action]')
    .forEach((b) => (b.onclick = () => setErase(b.dataset.action === 'erase')));
  $('size').oninput = (e) => {
    state.size = +(e.target as HTMLInputElement).value;
    $('sizeOut').textContent = String(state.size);
  };
  $('textSize').oninput = (e) => {
    state.textSize = +(e.target as HTMLInputElement).value;
    $('textSizeOut').textContent = String(state.textSize);
    refreshText();
  };
  $('stage').dataset.activeTool = state.tool;
}

function initModes(): void {
  const modeBtns = [...document.querySelectorAll<HTMLElement>('[data-mode]')];
  modeBtns.forEach(
    (btn) =>
      (btn.onclick = () => {
        state.mode = btn.dataset.mode as Mode;
        selectOne(modeBtns, btn);
        reveal($('customRow'), state.mode === 'custom', 'collapse');
        state.dirty = true;
      }),
  );
  $('customChars').oninput = (e) => {
    state.customRamp = Array.from((e.target as HTMLInputElement).value);
    state.dirty = true;
  };
  const paletteBtns = [...document.querySelectorAll<HTMLElement>('[data-palette]')];
  paletteBtns.forEach(
    (btn) =>
      (btn.onclick = () => {
        state.palette = btn.dataset.palette as Palette;
        selectOne(paletteBtns, btn);
        state.dirty = true;
      }),
  );
  $('bUnder').onclick = (e) => {
    state.under = !state.under;
    (e.currentTarget as HTMLElement).setAttribute('aria-pressed', String(state.under));
    state.dirty = true;
  };
}

function initHistory(): void {
  $('bUndo').onclick = doUndo;
  $('bRedo').onclick = doRedo;
  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const t = e.target as HTMLElement | null;
    if (
      t &&
      ((t.tagName === 'INPUT' && ['text', 'number'].includes((t as HTMLInputElement).type)) ||
        t.tagName === 'TEXTAREA')
    )
      return; // keep native text undo
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) {
      e.preventDefault();
      doUndo();
    } else if (k === 'y' || (k === 'z' && e.shiftKey)) {
      e.preventDefault();
      doRedo();
    }
  });
  $('bClear').onclick = () => {
    pushUndo();
    bctx.clearRect(0, 0, state.W, state.H);
    state.dirty = true;
    toast(t('toast.cleared'));
  };
}

export function initControls(): void {
  initTools();
  initModes();
  initColors();
  initHistory();
}
