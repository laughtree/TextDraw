import { $ } from '../dom';
import { downloadBlob } from '../download';
import { bounds } from '../export';
import { EXPORT_FILES, fileContent } from '../exportFile';
import { getLang, t } from '../i18n';
import { renderPng } from '../png';
import { state } from '../state';
import type { ExportFormat, ExportKind } from '../types';
import { exportCurrent } from './exportCurrent';
import { overLimit } from './platform';
import { closeMenu, toggleMenu } from './menus';
import { reveal } from './reveal';
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

/** The name of an export format as it reads in a sentence ("plain text", "HTML"…). */
const nounOf = (format: ExportFormat): string => {
  const noun = t(`noun.${format}`);
  // Chinese puts a space between its text and a Latin-letter word (已複製 HTML)
  return getLang() === 'zh-TW' && /^[A-Za-z]/.test(noun) ? ` ${noun}` : noun;
};

/** Close the export menu once something has been copied or saved. */
const closeExportMenu = (): void => closeMenu('export');

/** Anything drawn? (The text formats and the PNG all need at least one character.) */
function hasInk(): boolean {
  const { grid, gridCol, cols, rows } = state;
  return bounds({ grid, colors: gridCol, cols, rows }) !== null;
}

/** Copy a text format; the clipboard can be blocked, so fall back to showing it to copy by hand. */
function copyText(kind: ExportKind): void {
  const text = exportCurrent(kind);
  if (!text) {
    toast(t('toast.empty'));
    return;
  }
  const fallback = () => {
    const ta = $<HTMLTextAreaElement>('copyText');
    ta.value = text;
    reveal($('copyPanel'), true, 'fade');
    ta.select();
  };
  try {
    navigator.clipboard.writeText(text).then(() => {
      // only the plain text is what gets posted, so only it is checked against the limit
      const over = kind === 'text' ? overLimit(text) : null;
      const what = nounOf(kind);
      toast(
        over
          ? t('toast.copiedOver', {
              what,
              platform: over.label,
              used: over.used,
              limit: over.limit,
            })
          : t('toast.copied', { what }),
      );
      closeExportMenu();
    }, fallback);
  } catch {
    fallback();
  }
}

/** Save the picture as a PNG file. */
function savePng(blob: Blob, message?: string): void {
  downloadBlob(blob, EXPORT_FILES.image.name);
  toast(message ?? t('toast.downloaded', { name: EXPORT_FILES.image.name }));
  closeExportMenu();
}

/** Copy the picture to the clipboard, or save it when the browser cannot copy images. */
function copyImage(): void {
  if (!hasInk()) {
    toast(t('toast.empty'));
    return;
  }
  // the blob is passed as a promise so the copy starts inside the click (Safari insists on that)
  const png = renderPng().then((b) => b ?? Promise.reject(new Error('empty')));
  const canCopy =
    typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard?.write === 'function';
  const saveInstead = () =>
    void png.then(
      (b) => savePng(b, t('toast.imageNoCopy')),
      () => toast(t('toast.imageFail')),
    );
  if (!canCopy) return saveInstead();
  try {
    navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]).then(() => {
      toast(t('toast.copied', { what: nounOf('image') }));
      closeExportMenu();
    }, saveInstead);
  } catch {
    saveInstead();
  }
}

function download(format: ExportFormat): void {
  if (!hasInk()) {
    toast(t('toast.empty'));
    return;
  }
  if (format === 'image') {
    void renderPng().then(
      (b) => (b ? savePng(b) : toast(t('toast.imageFail'))),
      () => toast(t('toast.imageFail')),
    );
    return;
  }
  const file = EXPORT_FILES[format];
  downloadBlob(
    new Blob([fileContent(format, exportCurrent(format))], { type: file.mime }),
    file.name,
  );
  toast(t('toast.downloaded', { name: file.name }));
  closeExportMenu();
}

function initExportMenu(): void {
  $('bCopy').onclick = () => toggleMenu('export');

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
