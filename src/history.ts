import { $ } from './dom';
import { state } from './state';
import { bctx } from './surface';

const undo: ImageData[] = [];
const redo: ImageData[] = [];

const snap = () => bctx.getImageData(0, 0, state.W, state.H);

function syncHist(): void {
  $<HTMLButtonElement>('bUndo').disabled = !undo.length;
  $<HTMLButtonElement>('bRedo').disabled = !redo.length;
}

function restore(img: ImageData): void {
  bctx.clearRect(0, 0, state.W, state.H);
  bctx.putImageData(img, 0, 0);
  state.dirty = true;
}

export function pushUndo(): void {
  try {
    undo.push(snap());
    if (undo.length > 50) undo.shift();
    redo.length = 0;
  } catch {
    // snapshot failed (e.g. zero-size canvas): carry on without history for this stroke
  }
  syncHist();
}

export function doUndo(): void {
  const img = undo.pop();
  if (!img) return;
  redo.push(snap());
  restore(img);
  syncHist();
}

export function doRedo(): void {
  const img = redo.pop();
  if (!img) return;
  undo.push(snap());
  restore(img);
  syncHist();
}
