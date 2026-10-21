import { $ } from '../dom';
import { pushUndo } from '../history';
import { countOf, findPlatform, PLATFORMS, presetGrid, type Platform } from '../platforms';
import { state } from '../state';
import { setGrid } from '../surface';
import { exportCurrent } from './exportCurrent';

const GROUPS: { source: Platform['source']; label: string }[] = [
  { source: 'official', label: '官方文件已確認' },
  { source: 'thirdparty', label: '第三方來源（未經官方確認）' },
];

const noteOf = (p: Platform): string =>
  [
    p.rule,
    p.source === 'official' ? '' : '第三方來源，未經官方確認',
    '建議尺寸的欄數上限 32 為估計值',
  ]
    .filter(Boolean)
    .join('；');

/** How far the current plain-text output is over a platform's limit, or null when it is fine. */
export function overLimit(text: string): { label: string; used: number; limit: number } | null {
  const p = findPlatform(state.platform);
  if (!p) return null;
  const used = countOf(text, p.counter);
  return used > p.limit ? { label: p.label, used, limit: p.limit } : null;
}

/** "Target platform" drop-down: applies a suggested grid and shows used / limit for the output. */
export function initPlatform(): void {
  const select = $<HTMLSelectElement>('platform'),
    box = $('budget'),
    count = $('budgetCount'),
    note = $('budgetNote'),
    compact = $('canvasBudget');

  for (const g of GROUPS) {
    const group = document.createElement('optgroup');
    group.label = g.label;
    for (const p of PLATFORMS.filter((x) => x.source === g.source)) {
      const { cols, rows } = presetGrid(p);
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.label} · ${cols} × ${rows}`;
      group.append(opt);
    }
    select.append(group);
  }

  // the text a copy would produce, counted the platform's way; skip DOM writes when nothing changed
  let shown = '';
  const update = () => {
    const p = findPlatform(state.platform);
    box.hidden = compact.hidden = !p;
    if (!p) {
      shown = '';
      return;
    }
    const used = countOf(exportCurrent('text'), p.counter),
      over = used > p.limit;
    const key = `${p.id}|${used}`;
    if (key === shown) return;
    shown = key;
    count.textContent = `已用 ${used} / ${p.limit}${over ? ' · 超出上限' : ''}`;
    note.textContent = noteOf(p);
    compact.textContent = ` · ${used}/${p.limit}`;
    box.classList.toggle('over', over);
    compact.classList.toggle('over', over);
  };

  select.onchange = () => {
    const p = findPlatform(select.value);
    state.platform = p?.id ?? null;
    if (p) {
      pushUndo();
      setGrid(presetGrid(p), 'scale');
    }
    shown = '';
    update();
  };

  document.addEventListener('rendered', update);
  document.addEventListener('exportchange', () => {
    shown = '';
    update();
  });
  update();
}
