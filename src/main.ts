import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/600.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/noto-sans-tc/400.css';
import '@fontsource/noto-sans-tc/600.css';
import './styles/main.css';

import { initDraw } from './draw';
import { loop } from './render';
import { sample } from './sample';
import { state } from './state';
import { resize, stage } from './surface';
import { initBrush } from './ui/brush';
import { initCanvasSize } from './ui/canvasSize';
import { initControls } from './ui/controls';
import { initCopy } from './ui/copy';

initDraw();
initControls();
initBrush();
initCanvasSize();
initCopy();

// any theme change (OS preference or explicit data-theme) needs a repaint in the new ink colours
const markDirty = () => {
  state.dirty = true;
};
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', markDirty);
new MutationObserver(markDirty).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['data-theme'],
});
new ResizeObserver(() => resize()).observe(stage);

const start = () => {
  resize();
  sample();
  loop();
};
// glyph calibration measures the real font, so wait for it before the first conversion
void document.fonts.load('13px "IBM Plex Mono"').then(start, start);
