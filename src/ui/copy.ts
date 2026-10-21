import { $ } from '../dom';
import { state } from '../state';
import type { ExportKind } from '../types';
import { exportCurrent } from './exportCurrent';
import { overLimit } from './platform';
import { bindTip } from './tip';
import { toast } from './toast';

const LABELS: Record<ExportKind, string> = {
  text: '純文字',
  html: '彩色 HTML',
  ansi: 'ANSI 文字',
};

const initSpaceTip = () => bindTip($('tipBtn'), $('spaceTip'));

/** Space substitute and code fence change what gets copied (and how many characters it counts). */
const exportChanged = () => document.dispatchEvent(new Event('exportchange'));

function initSpaceChar(): void {
  const spBtns = [...document.querySelectorAll<HTMLElement>('[data-space]')];
  const setSpace = (ch: string) => {
    state.spaceChar = ch;
    spBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.space === ch)));
    exportChanged();
  };
  spBtns.forEach((b) => (b.onclick = () => setSpace(b.dataset.space ?? ' ')));
  $('bFence').onclick = (e) => {
    state.fence = !state.fence;
    (e.currentTarget as HTMLElement).setAttribute('aria-pressed', String(state.fence));
    exportChanged();
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
            // only the plain text is what gets posted, so only it is checked against the limit
            const over = kind === 'text' ? overLimit(t) : null;
            toast(
              over
                ? `已複製${LABELS[kind]}，但超過 ${over.label} 上限（${over.used} / ${over.limit}）`
                : '已複製' + LABELS[kind],
            );
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
