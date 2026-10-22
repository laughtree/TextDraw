import { $ } from '../dom';
import { state } from '../state';
import { commitText, refreshText } from '../text';
import type { Tool } from '../types';
import { reveal } from './reveal';

/** Select the shape to draw (or the eyedropper): one button of the shape group is pressed. */
export function setTool(tool: Tool): void {
  if (state.tool === 'text' && tool !== 'text') commitText();
  if (tool === 'pick' && state.tool !== 'pick') state.prevTool = state.tool;
  state.tool = tool;
  // the width is for strokes and shapes: the text tool has its own size, the eyedropper has none
  $<HTMLInputElement>('size').disabled = tool === 'text' || tool === 'pick';
  document
    .querySelectorAll<HTMLElement>('button[data-tool]')
    .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === tool)));
  $('stage').dataset.activeTool = tool;
  reveal($('textOpts'), tool === 'text', 'collapse');
  document.dispatchEvent(new Event('toolchange'));
}

/** Draw or erase: a mode that applies to whichever shape is selected. */
export function setErase(on: boolean): void {
  state.erase = on;
  document
    .querySelectorAll<HTMLElement>('[data-action]')
    .forEach((b) =>
      b.setAttribute('aria-pressed', String(b.dataset.action === (on ? 'erase' : 'draw'))),
    );
  refreshText(); // a text being typed switches between painting and cutting out
}
