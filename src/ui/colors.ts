import { $ } from '../dom';
import { state } from '../state';
import { refreshText } from '../text';
import { setTool } from './tools';

const swatches = (): HTMLElement[] => [
  ...document.querySelectorAll<HTMLElement>('.sw[data-color]'),
];
const pickInput = (): HTMLInputElement => $<HTMLInputElement>('colorPick');
const pickLabel = (): HTMLElement => pickInput().parentElement as HTMLElement;

/** Use `color` as the pen colour; `fromPicker` marks it as the custom (palette) colour. */
export function setPenColor(color: string, fromPicker: boolean): void {
  state.penColor = color;
  // choosing a colour is a request to draw with it: leave the eraser, or the eyedropper
  if (state.tool === 'erase') setTool('pen');
  else if (state.tool === 'pick') setTool(state.prevTool);
  swatches().forEach((b) =>
    b.setAttribute('aria-pressed', String(!fromPicker && b.dataset.color === color)),
  );
  pickLabel().classList.toggle('on', fromPicker);
  refreshText(); // a text being typed takes the new colour
}

/**
 * Use a colour read from a character: null is the theme ink (the ink swatch), a colour that
 * matches a preset swatch selects that swatch, anything else goes into the custom palette colour.
 */
export function usePickedColor(source: string | null): void {
  if (source === null) return setPenColor('#000000', false);
  const preset = swatches().find((b) => b.dataset.color?.toLowerCase() === source.toLowerCase());
  if (preset?.dataset.color) return setPenColor(preset.dataset.color, false);
  pickInput().value = source;
  pickLabel().style.setProperty('--pick', source);
  setPenColor(source, true);
}

export function initColors(): void {
  swatches().forEach((b) => (b.onclick = () => setPenColor(b.dataset.color ?? '#000000', false)));
  const pick = pickInput();
  pick.oninput = (e) => {
    const value = (e.target as HTMLInputElement).value;
    pickLabel().style.setProperty('--pick', value);
    // pure black is reserved for "theme ink", so nudge a picked black off it
    setPenColor(value === '#000000' ? '#010101' : value, true);
  };
  pick.onclick = () => setPenColor(pick.value, true);
}
