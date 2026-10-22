import { $ } from '../dom';
import { pickTarget } from '../pick';
import { state } from '../state';
import { paper, view } from '../surface';
import { css } from '../theme';
import { usePickedColor } from './colors';
import { toast } from './toast';
import { t } from '../i18n';

/**
 * Eyedropper tuned for characters: a click means the character nearby, wherever in its cell it
 * lands (see pickTarget), and the colour is the one that character was drawn in. While the pointer
 * moves a frame shows which character it would take, with a swatch of the colour.
 */
export function initEyedropper(): void {
  const frame = $('pickFrame'),
    chip = frame.querySelector<HTMLElement>('.chip') as HTMLElement;
  let target: number | null = null;

  const bufferPoint = (e: PointerEvent) => {
    const r = view.getBoundingClientRect();
    return { x: (e.clientX - r.left) / state.scale, y: (e.clientY - r.top) / state.scale };
  };

  const hide = () => {
    target = null;
    frame.hidden = true;
  };

  /** Frame the character under (or next to) the pointer. */
  const aim = (e: PointerEvent) => {
    if (state.tool !== 'pick') return hide();
    const { x, y } = bufferPoint(e);
    target = pickTarget(state.grid, state.cols, state.rows, state.cw, state.ch, x, y);
    if (target === null) return hide();
    const { cw, ch, cols, scale } = state,
      i = target % cols,
      j = Math.floor(target / cols);
    // a wide (Chinese) character spans its cell and the empty one after it
    const span = state.grid[target + 1] === '' && i + 1 < cols ? 2 : 1;
    frame.style.left = `${i * cw * scale}px`;
    frame.style.top = `${j * ch * scale}px`;
    frame.style.width = `${span * cw * scale}px`;
    frame.style.height = `${ch * scale}px`;
    chip.style.background = state.gridSrc[target] ?? css('--ink');
    // keep the colour swatch on screen: flip it to the left near the right edge
    frame.classList.toggle('flip', (i + span) * cw * scale + 28 > paper.clientWidth);
    frame.hidden = false;
  };

  view.addEventListener('pointerdown', aim);
  view.addEventListener('pointermove', aim);
  view.addEventListener('pointerleave', hide);
  view.addEventListener('pointercancel', hide);
  view.addEventListener('pointerup', (e) => {
    if (state.tool !== 'pick') return;
    aim(e); // touch has no hover, so the character is found where the finger lifted
    if (target === null) {
      toast(t('toast.noChar'));
      return;
    }
    usePickedColor(state.gridSrc[target] ?? null); // also returns to the previous tool
    hide();
  });
  // leaving the tool, by any route, puts the frame away
  document.addEventListener('toolchange', hide);
}
