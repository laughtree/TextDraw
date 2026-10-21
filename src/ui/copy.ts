import { $ } from '../dom';
import { downloadBlob } from '../download';
import { bounds } from '../export';
import { EXPORT_FILES, EXPORT_LABELS, fileContent } from '../exportFile';
import { renderPng } from '../png';
import { state } from '../state';
import type { ExportFormat, ExportKind } from '../types';
import { exportCurrent } from './exportCurrent';
import { overLimit } from './platform';
import { isOpen, reveal } from './reveal';
import { bindTip } from './tip';
import { toast } from './toast';

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

/** Put a space between Chinese text and a label that starts with a Latin letter (已複製 HTML). */
const spaced = (label: string): string => (/^[A-Za-z]/.test(label) ? ` ${label}` : label);

/** Close the export menu once something has been copied or saved. */
function closeMenu(): void {
  reveal($('copyMenu'), false, 'collapse');
  $('bCopy').setAttribute('aria-expanded', 'false');
}

/** Anything drawn? (The text formats and the PNG all need at least one character.) */
function hasInk(): boolean {
  const { grid, gridCol, cols, rows } = state;
  return bounds({ grid, colors: gridCol, cols, rows }) !== null;
}

/** Copy a text format; the clipboard can be blocked, so fall back to showing it to copy by hand. */
function copyText(kind: ExportKind): void {
  const t = exportCurrent(kind);
  if (!t) {
    toast('畫布是空的');
    return;
  }
  const fallback = () => {
    const ta = $<HTMLTextAreaElement>('copyText');
    ta.value = t;
    reveal($('copyPanel'), true, 'fade');
    ta.select();
  };
  try {
    navigator.clipboard.writeText(t).then(() => {
      // only the plain text is what gets posted, so only it is checked against the limit
      const over = kind === 'text' ? overLimit(t) : null;
      const label = spaced(EXPORT_LABELS[kind]);
      toast(
        over
          ? `已複製${label}，但超過 ${over.label} 上限（${over.used} / ${over.limit}）`
          : `已複製${label}`,
      );
      closeMenu();
    }, fallback);
  } catch {
    fallback();
  }
}

/** Save the picture as a PNG file. */
function savePng(blob: Blob, message?: string): void {
  downloadBlob(blob, EXPORT_FILES.image.name);
  toast(message ?? `已下載 ${EXPORT_FILES.image.name}`);
  closeMenu();
}

/** Copy the picture to the clipboard, or save it when the browser cannot copy images. */
function copyImage(): void {
  if (!hasInk()) {
    toast('畫布是空的');
    return;
  }
  // the blob is passed as a promise so the copy starts inside the click (Safari insists on that)
  const png = renderPng().then((b) => b ?? Promise.reject(new Error('empty')));
  const canCopy =
    typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard?.write === 'function';
  const saveInstead = () =>
    void png.then(
      (b) => savePng(b, '瀏覽器不支援圖片複製，已改為下載'),
      () => toast('無法產生圖片'),
    );
  if (!canCopy) return saveInstead();
  try {
    navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]).then(() => {
      toast('已複製圖片');
      closeMenu();
    }, saveInstead);
  } catch {
    saveInstead();
  }
}

function download(format: ExportFormat): void {
  if (!hasInk()) {
    toast('畫布是空的');
    return;
  }
  if (format === 'image') {
    void renderPng().then(
      (b) => (b ? savePng(b) : toast('無法產生圖片')),
      () => toast('無法產生圖片'),
    );
    return;
  }
  const file = EXPORT_FILES[format];
  downloadBlob(
    new Blob([fileContent(format, exportCurrent(format))], { type: file.mime }),
    file.name,
  );
  toast(`已下載 ${file.name}`);
  closeMenu();
}

function initExportMenu(): void {
  $('bCopy').onclick = (e) => {
    const show = !isOpen($('copyMenu'));
    reveal($('copyMenu'), show, 'collapse');
    (e.currentTarget as HTMLElement).setAttribute('aria-expanded', String(show));
  };

  const formatBtns = [...document.querySelectorAll<HTMLElement>('[data-format]')];
  formatBtns.forEach(
    (btn) =>
      (btn.onclick = () => {
        state.exportFormat = btn.dataset.format as ExportFormat;
        formatBtns.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      }),
  );
  $('bDoCopy').onclick = () => {
    if (state.exportFormat === 'image') copyImage();
    else copyText(state.exportFormat);
  };
  $('bDoDownload').onclick = () => download(state.exportFormat);

  $('bClosePanel').onclick = () => {
    reveal($('copyPanel'), false, 'fade');
  };
}

export function initCopy(): void {
  initSpaceTip();
  initSpaceChar();
  initExportMenu();
}
