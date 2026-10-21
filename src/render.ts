import { blockPaint } from './blocks';
import { DOTS } from './charsets';
import { convert } from './convert';
import { state } from './state';
import { bctx, buf, metrics, monoFont, tctx, tint, vctx } from './surface';
import { css, lumOfToken } from './theme';

function convertBuffer() {
  const m = metrics();
  const px = bctx.getImageData(0, 0, m.W, m.H).data;
  return convert(px, m, {
    mode: state.mode,
    palette: state.palette,
    customRamp: state.customRamp,
    Ybg: lumOfToken('--bg'),
    Yink: lumOfToken('--ink'),
  });
}

export function render(): void {
  if (!state.dirty) return;
  state.dirty = false;
  const { chars, colors, source } = convertBuffer();
  state.grid = chars;
  state.gridCol = colors;
  state.gridSrc = source;
  document.dispatchEvent(new Event('rendered')); // budget readout etc. follow the new text
  const { W, H, cw, ch, cols, rows, mode, under } = state;
  const grid = chars;
  const ink = css('--ink');
  const colorAt = (k: number) => colors[k] || ink;
  vctx.setTransform(state.renderScale, 0, 0, state.renderScale, 0, 0);
  vctx.clearRect(0, 0, W, H);
  if (under) {
    tctx.globalCompositeOperation = 'source-over';
    tctx.clearRect(0, 0, W, H);
    tctx.drawImage(buf, 0, 0);
    tctx.globalCompositeOperation = 'source-in';
    tctx.fillStyle = css('--faint');
    tctx.fillRect(0, 0, W, H);
    vctx.globalAlpha = 0.35;
    vctx.drawImage(tint, 0, 0);
    vctx.globalAlpha = 1;
  }
  vctx.font = monoFont();
  vctx.textBaseline = 'middle';
  if (mode === 'braille') {
    // draw dots ourselves so they look even regardless of font coverage
    const r = Math.max(1, cw * 0.16),
      BIT = [
        [1, 0, 0],
        [2, 0, 1],
        [4, 0, 2],
        [64, 0, 3],
        [8, 1, 0],
        [16, 1, 1],
        [32, 1, 2],
        [128, 1, 3],
      ];
    for (let k = 0; k < grid.length; k++) {
      const c = grid[k];
      if (c === ' ') continue;
      const b = c.charCodeAt(0) - 0x2800,
        x0 = (k % cols) * cw,
        y0 = ((k / cols) | 0) * ch;
      vctx.fillStyle = colorAt(k);
      vctx.beginPath();
      for (const [bit, sc, sr] of BIT)
        if (b & bit) {
          const x = x0 + cw * (0.28 + sc * 0.44),
            y = y0 + ch * (0.14 + sr * 0.24);
          vctx.moveTo(x + r, y);
          vctx.arc(x, y, r, 0, Math.PI * 2);
        }
      vctx.fill();
    }
    return;
  }
  if (mode === 'block') {
    for (let k = 0; k < grid.length; k++) {
      const paint = blockPaint(grid[k]);
      if (!paint) continue;
      const x0 = (k % cols) * cw,
        y0 = ((k / cols) | 0) * ch;
      vctx.fillStyle = colorAt(k);
      vctx.globalAlpha = paint.alpha;
      for (const [fx0, fy0, fx1, fy1] of paint.rects)
        vctx.fillRect(x0 + fx0 * cw, y0 + fy0 * ch, (fx1 - fx0) * cw + 0.5, (fy1 - fy0) * ch + 0.5);
      vctx.globalAlpha = 1;
    }
    return;
  }
  if (mode === 'dots') {
    for (let k = 0; k < grid.length; k++) {
      const d = DOTS.find((e) => e[0] === grid[k]);
      if (!d || !d[1]) continue;
      vctx.fillStyle = colorAt(k);
      vctx.beginPath();
      vctx.arc((k % cols) * cw + cw / 2, ((k / cols) | 0) * ch + ch / 2, d[1] * cw, 0, Math.PI * 2);
      vctx.fill();
    }
    return;
  }
  for (let j = 0; j < rows; j++) {
    const y = j * ch + ch / 2 + 0.5;
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i,
        c = grid[k];
      if (c === ' ' || c === '') continue;
      vctx.fillStyle = colorAt(k);
      if (mode === 'cjk') vctx.fillText(c, i * cw, y, cw * 2);
      else if (c.charCodeAt(0) > 126) vctx.fillText(c, i * cw, y, cw);
      else vctx.fillText(c, i * cw, y);
    }
  }
}

export function loop(): void {
  render();
  requestAnimationFrame(loop);
}
