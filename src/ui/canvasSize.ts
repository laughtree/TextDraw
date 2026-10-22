import { $ } from '../dom';
import { clampGrid, LIMITS, parseDim } from '../grid';
import { pushUndo } from '../history';
import { t } from '../i18n';
import { findPlatform } from '../platforms';
import { platformLabel } from './platformText';
import { state } from '../state';
import { setGrid } from '../surface';
import { isOpen, reveal } from './reveal';
import { toast } from './toast';

/** "畫布大小" panel: 滿版 (follow the window) or a fixed columns × rows grid. */
export function initCanvasSize(): void {
  const toggle = $('bCanvas'),
    panel = $('canvasPanel'),
    auto = $('bAuto'),
    summary = $('canvasSummary'),
    inCols = $<HTMLInputElement>('inCols'),
    inRows = $<HTMLInputElement>('inRows');

  // reflect the current grid (also after undo/redo and window resizes in full mode)
  const sync = () => {
    const isFull = !state.fixed;
    auto.setAttribute('aria-pressed', String(isFull));
    inCols.disabled = isFull;
    inRows.disabled = isFull;
    inCols.value = String(state.cols);
    inRows.value = String(state.rows);
    // what the size is for: full window, the chosen platform, or a size of your own
    const found = findPlatform(state.platform),
      name = isFull ? t('canvas.full') : found ? platformLabel(found) : t('platform.custom');
    summary.textContent = `${name} · ${state.cols} × ${state.rows}`;
  };
  document.addEventListener('gridchange', sync);
  document.addEventListener('platformchange', sync);
  document.addEventListener('langchange', sync);

  toggle.onclick = () => {
    const show = !isOpen(panel);
    reveal(panel, show, 'collapse');
    toggle.setAttribute('aria-expanded', String(show));
  };

  auto.onclick = () => {
    pushUndo();
    // leaving 滿版 starts from the grid on screen; returning to it stretches the painting to the window
    setGrid(state.fixed ? null : clampGrid(state.cols, state.rows), 'scale');
  };

  const commit = () => {
    const c = parseDim(inCols.value, state.cols),
      r = parseDim(inRows.value, state.rows);
    const g = clampGrid(c, r);
    if (g.cols !== Math.round(c) || g.rows !== Math.round(r)) toast(t('canvas.range', LIMITS));
    if (g.cols === state.cols && g.rows === state.rows) {
      sync(); // nothing changed, or the typed text was invalid: show the real values again
      return;
    }
    pushUndo();
    setGrid(g);
  };
  inCols.onchange = commit;
  inRows.onchange = commit;

  sync();
}
