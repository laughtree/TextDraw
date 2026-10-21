import { $ } from './dom';
import { commitUndo, restoreBase, takeSnapshot, type Entry } from './history';
import type { Point } from './shapes';
import { state } from './state';
import { bctx, paper } from './surface';

/** IBM Plex Mono bold; Chinese falls through to Noto Sans TC (both are loaded by main.ts). */
export const textFont = (size: number): string =>
  `600 ${size}px "IBM Plex Mono", "Noto Sans TC", monospace`;

interface Edit {
  base: Entry | null;
  at: Point;
}
let edit: Edit | null = null;
let token = 0;

const input = (): HTMLInputElement => $<HTMLInputElement>('textEdit');

export const isEditing = (): boolean => edit !== null;

/** Paint `text` with its top-left at `at`: the tops of capital letters sit on the click point. */
export function paintText(ctx: CanvasRenderingContext2D, text: string, at: Point): void {
  ctx.save();
  ctx.font = textFont(state.textSize);
  ctx.fillStyle = state.penColor;
  ctx.textBaseline = 'alphabetic';
  const ascent = ctx.measureText('M').actualBoundingBoxAscent;
  ctx.fillText(text, at.x, at.y + ascent);
  ctx.restore();
}

/** Redraw the live preview: the untouched canvas plus the text typed so far. */
function preview(): void {
  if (!edit) return;
  const { base, at } = edit,
    text = input().value;
  const draw = () => {
    if (!edit || edit.base !== base) return;
    if (base) restoreBase(base);
    if (text) paintText(bctx, text, at);
    state.dirty = true;
  };
  if (document.fonts.check(textFont(state.textSize), text)) draw();
  else {
    // glyph slices (Chinese in particular) load on demand; draw as soon as they are in
    const mine = ++token;
    void document.fonts.load(textFont(state.textSize), text).then(() => {
      if (mine === token) draw();
    });
    draw();
  }
}

/** Open the one-line editor at a canvas point (buffer px). */
export function beginText(at: Point): void {
  commitText();
  edit = { base: takeSnapshot(), at };
  const el = input();
  el.value = '';
  el.hidden = false;
  // above the point when there is room, otherwise below the line of text that will appear
  const boxH = 36,
    gap = 6,
    s = state.scale;
  const above = at.y * s - boxH - gap;
  const top = above >= 4 ? above : at.y * s + state.textSize * s * 1.2 + gap;
  el.style.top = `${Math.min(top, paper.clientHeight - boxH - 4)}px`;
  el.style.left = `${Math.max(4, Math.min(at.x * s, paper.clientWidth - el.offsetWidth - 4))}px`;
  el.focus();
}

/** Keep what was typed (nothing typed = nothing recorded). */
export function commitText(): void {
  if (!edit) return;
  const { base } = edit,
    text = input().value;
  edit = null;
  input().hidden = true;
  if (text.trim() === '') {
    if (base) restoreBase(base);
    return;
  }
  commitUndo(base);
}

/** Throw the typed text away and put the canvas back. */
export function cancelText(): void {
  if (!edit) return;
  const { base } = edit;
  edit = null;
  input().hidden = true;
  if (base) restoreBase(base);
}

/** Redraw the preview after the colour or size changed while typing. */
export function refreshText(): void {
  if (edit) preview();
}

export function initText(): void {
  const el = input();
  el.addEventListener('input', preview);
  el.addEventListener('keydown', (e) => {
    if (e.isComposing || e.keyCode === 229) return; // the input method is still picking characters
    if (e.key === 'Enter') {
      e.preventDefault();
      commitText();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelText();
    }
  });
  el.addEventListener('blur', commitText);
}
