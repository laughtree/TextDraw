import { exportAs } from '../export';
import { state } from '../state';
import type { ExportKind } from '../types';

/** What the copy buttons would put on the clipboard right now. */
export function exportCurrent(kind: ExportKind): string {
  const { grid, gridCol, cols, rows, spaceChar, fence } = state;
  return exportAs(kind, { grid, colors: gridCol, cols, rows }, { spaceChar, fence });
}
