import { convert } from './convert';
import { paintGrid } from './paint';
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
  paintGrid(vctx, grid, colors, { cw, ch, cols, rows }, mode, ink, monoFont());
}

export function loop(): void {
  render();
  requestAnimationFrame(loop);
}
