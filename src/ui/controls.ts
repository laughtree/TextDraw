import { $ } from '../dom';
import { doRedo, doUndo, pushUndo } from '../history';
import { state } from '../state';
import { bctx } from '../surface';
import type { Mode, Palette } from '../types';
import { toast } from './toast';

function setPressed(a: string, b: string, on: boolean): void {
  $(a).setAttribute('aria-pressed', String(on));
  $(b).setAttribute('aria-pressed', String(!on));
}

/** Mark `active` as the pressed one among `buttons` (single-choice segmented control). */
function selectOne(buttons: HTMLElement[], active: HTMLElement): void {
  buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === active)));
}

function initTools(): void {
  $('tPen').onclick = () => {
    state.tool = 'pen';
    setPressed('tPen', 'tErase', true);
  };
  $('tErase').onclick = () => {
    state.tool = 'erase';
    setPressed('tPen', 'tErase', false);
  };
  $('size').oninput = (e) => {
    state.size = +(e.target as HTMLInputElement).value;
    $('sizeOut').textContent = String(state.size);
  };
}

function initModes(): void {
  const modeBtns = [...document.querySelectorAll<HTMLElement>('[data-mode]')];
  modeBtns.forEach(
    (btn) =>
      (btn.onclick = () => {
        state.mode = btn.dataset.mode as Mode;
        selectOne(modeBtns, btn);
        $('customRow').hidden = state.mode !== 'custom';
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

function initColors(): void {
  const swBtns = [...document.querySelectorAll<HTMLElement>('.sw[data-color]')],
    pick = $<HTMLInputElement>('colorPick'),
    pickLbl = pick.parentElement as HTMLElement;
  function choose(color: string, fromPicker: boolean): void {
    state.penColor = color;
    if (state.tool === 'erase') {
      state.tool = 'pen';
      setPressed('tPen', 'tErase', true);
    }
    swBtns.forEach((b) =>
      b.setAttribute('aria-pressed', String(!fromPicker && b.dataset.color === color)),
    );
    pickLbl.classList.toggle('on', fromPicker);
  }
  swBtns.forEach((b) => (b.onclick = () => choose(b.dataset.color ?? '#000000', false)));
  pick.oninput = (e) => {
    const value = (e.target as HTMLInputElement).value;
    $('pickSwatch').style.background = value;
    // pure black is reserved for "theme ink", so nudge a picked black off it
    choose(value === '#000000' ? '#010101' : value, true);
  };
  pick.onclick = () => choose(pick.value, true);
}

function initHistory(): void {
  $('bUndo').onclick = doUndo;
  $('bRedo').onclick = doRedo;
  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const t = e.target as HTMLElement | null;
    if (
      t &&
      ((t.tagName === 'INPUT' && (t as HTMLInputElement).type === 'text') ||
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
    toast('已清空，按復原可救回');
  };
}

export function initControls(): void {
  initTools();
  initModes();
  initColors();
  initHistory();
}
