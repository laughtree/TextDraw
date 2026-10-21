import { $ } from '../dom';
import { pushUndo } from '../history';
import { countOf, findPlatform, PLATFORMS, presetGrid, type Platform } from '../platforms';
import { state } from '../state';
import { setGrid } from '../surface';
import { exportCurrent } from './exportCurrent';
import { bindTip } from './tip';

const SOURCE_TEXT: Record<Platform['source'], string> = {
  official: '官方文件已確認',
  thirdparty: '第三方來源，未經官方確認',
  estimate: '通用估計值，非任何平台的官方數字，請在實際聊天軟體實測後調整',
};

/** How far the current plain-text output is over a platform's limit, or null when it is fine. */
export function overLimit(text: string): { label: string; used: number; limit: number } | null {
  const p = findPlatform(state.platform);
  if (!p || p.limit === null) return null;
  const used = countOf(text, p.counter);
  return used > p.limit ? { label: p.label, used, limit: p.limit } : null;
}

/** One help paragraph: a bold heading, then its text. */
function paragraph(heading: string, text: string): HTMLParagraphElement {
  const p = document.createElement('p');
  const b = document.createElement('b');
  b.textContent = heading;
  p.append(b, text);
  return p;
}

/** The platform's help bubble: limit and counting rule, where the numbers come from, suggested size. */
function describe(p: Platform): HTMLParagraphElement[] {
  const { cols, rows } = presetGrid(p);
  const title = p.limit === null ? `${p.label}\u3000通用估計` : `${p.label}\u3000上限 ${p.limit}`;
  const size =
    p.source === 'estimate'
      ? `${cols} × ${rows}（欄 ≈ 列 × 2）`
      : `${cols} × ${rows}（欄 ≈ 列 × 2；欄數上限 32 為估計值，非官方）`;
  return [
    paragraph(title, p.rule),
    paragraph('資料來源', SOURCE_TEXT[p.source]),
    paragraph('建議尺寸', size),
  ];
}

/** "Target platform" drop-down: applies a suggested grid and shows used / limit for the output. */
export function initPlatform(): void {
  const select = $<HTMLSelectElement>('platform'),
    box = $('budget'),
    count = $('budgetCount'),
    compact = $('canvasBudget'),
    tipBtn = $('platformTipBtn'),
    tipBox = $('platformTip');
  const tip = bindTip(tipBtn, tipBox);

  for (const p of PLATFORMS) {
    const { cols, rows } = presetGrid(p);
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.label} · ${cols} × ${rows}`;
    select.append(opt);
  }

  // the text a copy would produce, counted the platform's way; skip DOM writes when nothing changed
  let shown = '';
  const update = () => {
    const p = findPlatform(state.platform);
    box.hidden = compact.hidden = !p || p.limit === null;
    if (!p || p.limit === null) {
      shown = '';
      return;
    }
    const used = countOf(exportCurrent('text'), p.counter),
      over = used > p.limit;
    const key = `${p.id}|${used}`;
    if (key === shown) return;
    shown = key;
    count.textContent = `已用 ${used} / ${p.limit}${over ? ' · 超出上限' : ''}`;
    compact.textContent = ` · ${used}/${p.limit}`;
    box.classList.toggle('over', over);
    compact.classList.toggle('over', over);
  };

  select.onchange = () => {
    const p = findPlatform(select.value);
    state.platform = p?.id ?? null;
    tip.close();
    tipBtn.hidden = !p;
    tipBox.replaceChildren(...(p ? describe(p) : []));
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
