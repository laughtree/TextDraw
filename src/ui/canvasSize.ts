import { $ } from '../dom';
import { clampGrid, LIMITS, parseDim } from '../grid';
import { pushUndo } from '../history';
import { state } from '../state';
import { setGrid } from '../surface';
import { toast } from './toast';

/** "畫布大小" panel: auto (follow the window) or a fixed columns × rows grid. */
export function initCanvasSize(): void {
  const toggle = $('bCanvas'),
    panel = $('canvasPanel'),
    auto = $('bAuto'),
    summary = $('canvasSummary'),
    inCols = $<HTMLInputElement>('inCols'),
    inRows = $<HTMLInputElement>('inRows');

  // reflect the current grid (also after undo/redo and window resizes in auto mode)
  const sync = () => {
    const isAuto = !state.fixed;
    auto.setAttribute('aria-pressed', String(isAuto));
    inCols.disabled = isAuto;
    inRows.disabled = isAuto;
    inCols.value = String(state.cols);
    inRows.value = String(state.rows);
    summary.textContent = `${isAuto ? '自動 · ' : ''}${state.cols} × ${state.rows}`;
  };
  document.addEventListener('gridchange', sync);

  toggle.onclick = () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute('aria-expanded', String(!panel.hidden));
  };

  auto.onclick = () => {
    pushUndo();
    // leaving auto starts from the grid on screen; returning to it stretches the painting to the window
    setGrid(state.fixed ? null : clampGrid(state.cols, state.rows), 'scale');
  };

  const commit = () => {
    const c = parseDim(inCols.value, state.cols),
      r = parseDim(inRows.value, state.rows);
    const g = clampGrid(c, r);
    if (g.cols !== Math.round(c) || g.rows !== Math.round(r))
      toast(`欄 ${LIMITS.minCols}–${LIMITS.maxCols}、列 ${LIMITS.minRows}–${LIMITS.maxRows}`);
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
