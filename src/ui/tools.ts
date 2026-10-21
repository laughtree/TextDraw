import { $ } from '../dom';
import { state } from '../state';
import { commitText } from '../text';
import type { Tool } from '../types';
import { reveal } from './reveal';

/** Select a drawing tool: one button across every tool group is pressed. */
export function setTool(tool: Tool): void {
  if (state.tool === 'text' && tool !== 'text') commitText();
  if (tool === 'pick' && state.tool !== 'pick') state.prevTool = state.tool;
  state.tool = tool;
  document
    .querySelectorAll<HTMLElement>('[data-tool]')
    .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === tool)));
  $('stage').dataset.activeTool = tool;
  reveal($('textOpts'), tool === 'text', 'fade');
  document.dispatchEvent(new Event('toolchange'));
}
