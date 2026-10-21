import { $ } from './dom';
import type { Grid } from './grid';
import { state } from './state';
import { bctx, setGrid } from './surface';

/** A snapshot plus the grid setting it was taken under, so grid changes can be undone too. */
interface Entry {
  img: ImageData;
  fixed: Grid | null;
}

const undo: Entry[] = [];
const redo: Entry[] = [];
const MAX_STEPS = 50;
/** big canvases make big snapshots; drop the oldest ones beyond this total */
const MAX_BYTES = 128 * 1024 * 1024;

const snap = (): Entry => ({
  img: bctx.getImageData(0, 0, state.W, state.H),
  fixed: state.fixed && { ...state.fixed },
});

const sameGrid = (a: Grid | null, b: Grid | null) =>
  a === b || (!!a && !!b && a.cols === b.cols && a.rows === b.rows);

const totalBytes = () => [...undo, ...redo].reduce((n, e) => n + e.img.data.byteLength, 0);

function syncHist(): void {
  $<HTMLButtonElement>('bUndo').disabled = !undo.length;
  $<HTMLButtonElement>('bRedo').disabled = !redo.length;
}

function restore(e: Entry): void {
  if (!sameGrid(e.fixed, state.fixed)) setGrid(e.fixed); // the image below replaces whatever this does
  bctx.clearRect(0, 0, state.W, state.H);
  bctx.putImageData(e.img, 0, 0);
  state.dirty = true;
}

export function pushUndo(): void {
  try {
    undo.push(snap());
    while (undo.length > MAX_STEPS || (undo.length > 1 && totalBytes() > MAX_BYTES)) undo.shift();
    redo.length = 0;
  } catch {
    // snapshot failed (e.g. zero-size canvas): carry on without history for this stroke
  }
  syncHist();
}

export function doUndo(): void {
  const e = undo.pop();
  if (!e) return;
  redo.push(snap());
  restore(e);
  syncHist();
}

export function doRedo(): void {
  const e = redo.pop();
  if (!e) return;
  undo.push(snap());
  restore(e);
  syncHist();
}
