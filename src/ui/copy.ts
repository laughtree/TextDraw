import { $ } from '../dom';
import { exportAs } from '../export';
import { state } from '../state';
import type { ExportKind } from '../types';
import { toast } from './toast';

const LABELS: Record<ExportKind, string> = {
  text: '純文字',
  html: '彩色 HTML',
  ansi: 'ANSI 文字',
};

function exportCurrent(kind: ExportKind): string {
  const { grid, gridCol, cols, rows, spaceChar, fence } = state;
  return exportAs(kind, { grid, colors: gridCol, cols, rows }, { spaceChar, fence });
}

function initSpaceTip(): void {
  const tipBtn = $('tipBtn'),
    tip = $('spaceTip');
  const setTip = (open: boolean) => {
    tip.hidden = !open;
    tipBtn.setAttribute('aria-expanded', String(open));
  };
  tipBtn.onclick = (e) => {
    e.stopPropagation();
    setTip(Boolean(tip.hidden));
  };
  document.addEventListener('click', (e) => {
    if (!tip.hidden && !tip.contains(e.target as Node)) setTip(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setTip(false);
  });
}

function initSpaceChar(): void {
  const spBtns = [...document.querySelectorAll<HTMLElement>('[data-space]')];
  const setSpace = (ch: string) => {
    state.spaceChar = ch;
    spBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.space === ch)));
  };
  spBtns.forEach((b) => (b.onclick = () => setSpace(b.dataset.space ?? ' ')));
  $('bFence').onclick = (e) => {
    state.fence = !state.fence;
    (e.currentTarget as HTMLElement).setAttribute('aria-pressed', String(state.fence));
  };
}

function initCopyButtons(): void {
  $('bCopy').onclick = (e) => {
    const m = $('copyMenu');
    m.hidden = !m.hidden;
    (e.currentTarget as HTMLElement).setAttribute('aria-expanded', String(!m.hidden));
  };
  document.querySelectorAll<HTMLElement>('[data-copy]').forEach(
    (btn) =>
      (btn.onclick = () => {
        const kind = btn.dataset.copy as ExportKind,
          t = exportCurrent(kind);
        if (!t) {
          toast('畫布是空的');
          return;
        }
        // clipboard API can be blocked (insecure context, iframe); show the text to copy by hand
        const fallback = () => {
          const ta = $<HTMLTextAreaElement>('copyText');
          ta.value = t;
          $('copyPanel').hidden = false;
          ta.select();
        };
        try {
          navigator.clipboard.writeText(t).then(() => {
            toast('已複製' + LABELS[kind]);
            $('copyMenu').hidden = true;
            $('bCopy').setAttribute('aria-expanded', 'false');
          }, fallback);
        } catch {
          fallback();
        }
      }),
  );
  $('bClosePanel').onclick = () => {
    $('copyPanel').hidden = true;
  };
}

export function initCopy(): void {
  initSpaceTip();
  initSpaceChar();
  initCopyButtons();
}
