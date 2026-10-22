import { $ } from './dom';
import { caretBox, type CaretMetrics } from './caret';
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

const caretEl = (): HTMLElement => $('textCaret');

export const isEditing = (): boolean => edit !== null;

/**
 * Measure the text before the cursor the way `paintText` will draw it. The bar spans the ink of tall
 * and hanging letters (H d / g j p q y) rather than the font's full line box, which is a lot taller
 * than any text, so the caret is as big as the letters it stands for.
 */
function measureCaret(text: string): CaretMetrics {
  bctx.save();
  bctx.font = textFont(state.textSize);
  const before = bctx.measureText(text),
    cap = bctx.measureText('M'),
    tall = bctx.measureText('Hdgjpqy');
  bctx.restore();
  return {
    width: before.width,
    ascent: tall.actualBoundingBoxAscent,
    descent: tall.actualBoundingBoxDescent,
    capAscent: cap.actualBoundingBoxAscent,
  };
}

/**
 * Put the blinking caret where the next character will go, as tall as the text will be.
 * `restart` makes it solid again for a moment (it blinks only while nothing is typed).
 */
function updateCaret(restart = false): void {
  const el = caretEl();
  if (!edit) {
    el.hidden = true;
    return;
  }
  const field = input(),
    cursor = field.selectionStart ?? field.value.length;
  const box = caretBox(
    edit.at,
    measureCaret(field.value.slice(0, cursor)),
    state.textSize,
    state.scale,
  );
  el.hidden = false;
  el.style.left = `${box.left}px`;
  el.style.top = `${box.top}px`;
  el.style.width = `${box.width}px`;
  el.style.height = `${box.height}px`;
  el.style.background = state.penColor;
  if (restart) {
    el.style.animation = 'none';
    void el.offsetWidth; // reflow, so the blink starts over
    el.style.animation = '';
  }
}

/** Paint `text` with its top-left at `at`: the tops of capital letters sit on the click point. */
export function paintText(ctx: CanvasRenderingContext2D, text: string, at: Point): void {
  ctx.save();
  ctx.globalCompositeOperation = state.erase ? 'destination-out' : 'source-over'; // erasing cuts out the letters
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
    updateCaret(); // the font may only just have arrived
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
  updateCaret(true);
}

/** Keep what was typed (nothing typed = nothing recorded). */
export function commitText(): void {
  if (!edit) return;
  const { base } = edit,
    text = input().value;
  edit = null;
  input().hidden = true;
  updateCaret();
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
  updateCaret();
  if (base) restoreBase(base);
}

/** Redraw the preview after the colour or size changed while typing. */
export function refreshText(): void {
  if (edit) preview();
  updateCaret();
}

export function initText(): void {
  const el = input();
  el.addEventListener('input', preview);
  // the caret follows typing and cursor movement (arrows, Home/End, a click inside the field)
  for (const type of ['input', 'keyup', 'click', 'select', 'compositionupdate'])
    el.addEventListener(type, () => updateCaret(true));
  document.addEventListener('gridchange', () => updateCaret()); // the scale may have changed
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
