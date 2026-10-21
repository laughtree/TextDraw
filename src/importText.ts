import { blockPaint } from './blocks';
import { clampGrid } from './grid';
import { pushUndo } from './history';
import { BRAILLE_BITS, brailleDot } from './paint';
import { state } from './state';
import { bctx, monoFont, setGrid } from './surface';
import { commitText } from './text';
import { type Art, cellWidth, isBlank, parseArt } from './textGrid';
import { toast } from './ui/toast';

/** Braille dots are drawn larger than on screen: each must cover well over 0.28 of its 2×4 zone. */
const DOT_R = 0.2;

/** Paint one cell's character into the drawing buffer, in the pen colour. */
function paintCell(c: string, x0: number, y0: number): void {
  const { cw, ch, penColor } = state;
  bctx.fillStyle = penColor;
  const cp = c.codePointAt(0) ?? 0;
  if (cp > 0x2800 && cp <= 0x28ff) {
    bctx.beginPath();
    for (const [bit, sc, sr] of BRAILLE_BITS)
      if ((cp - 0x2800) & bit) {
        const [x, y] = brailleDot(x0, y0, cw, ch, sc, sr);
        bctx.moveTo(x + cw * DOT_R, y);
        bctx.arc(x, y, cw * DOT_R, 0, Math.PI * 2);
      }
    bctx.fill();
    return;
  }
  const block = blockPaint(c);
  if (block) {
    bctx.globalAlpha = block.alpha;
    for (const [fx0, fy0, fx1, fy1] of block.rects)
      bctx.fillRect(x0 + fx0 * cw, y0 + fy0 * ch, (fx1 - fx0) * cw + 0.5, (fy1 - fy0) * ch + 0.5);
    bctx.globalAlpha = 1;
    return;
  }
  bctx.fillText(c, x0, y0 + ch / 2 + 0.5, cw * cellWidth(c));
}

function paintArt(art: Art): void {
  bctx.save();
  bctx.globalCompositeOperation = 'source-over'; // importing always adds ink, whatever the draw/erase mode
  bctx.font = monoFont();
  bctx.textBaseline = 'middle';
  art.lines.forEach((line, j) =>
    line.forEach((c, i) => {
      if (!isBlank(c)) paintCell(c, i * state.cw, j * state.ch);
    }),
  );
  bctx.restore();
}

let token = 0;

/** Replace the canvas with text art: the grid becomes the size of the text, one character per cell. */
export async function importText(text: string): Promise<boolean> {
  const art = parseArt(text);
  if (art.rows === 0) {
    toast('沒有可匯入的文字');
    return false;
  }
  const mine = ++token;
  // glyph slices (Chinese in particular) load on demand; wait so they are not painted blank
  const chars = [...new Set(art.lines.flat().filter((c) => !isBlank(c)))].join('');
  try {
    await document.fonts.load(monoFont(), chars);
  } catch {
    // paint with whatever font is there
  }
  if (mine !== token) return false; // a newer import took over
  commitText();
  const grid = clampGrid(art.cols, art.rows);
  pushUndo();
  setGrid(grid);
  bctx.clearRect(0, 0, state.W, state.H);
  paintArt(art);
  state.dirty = true;
  toast(
    art.cropped
      ? `已匯入文字，已裁切到 ${grid.cols} × ${grid.rows}`
      : `已匯入文字（${grid.cols} × ${grid.rows}）`,
  );
  return true;
}
