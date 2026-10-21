import { sampleLayout } from './sampleLayout';
import { state } from './state';
import { bctx } from './surface';

/** Paint the starter picture: the words in SAMPLE_LINES in the block font. */
export function sample(): void {
  const { cw, ch, cols, rows } = state;
  bctx.save();
  bctx.fillStyle = '#000';
  for (const { x, y, w, h } of sampleLayout(cw, ch, cols, rows).rects) bctx.fillRect(x, y, w, h);
  bctx.restore();
  state.dirty = true;
}
