import { $ } from '../dom';
import { pushUndo } from '../history';
import { t, type Key } from '../i18n';
import { countOf, findPlatform, PLATFORMS, presetGrid, type Platform } from '../platforms';
import { state } from '../state';
import { setGrid } from '../surface';
import { exportCurrent } from './exportCurrent';
import { platformLabel, platformRule } from './platformText';
import { reveal } from './reveal';
import { bindTip } from './tip';

/** The platform preset the page starts with. */
const START_PLATFORM = 'chat';

const SOURCE_KEY: Record<Platform['source'], Key> = {
  official: 'platform.source.official',
  thirdparty: 'platform.source.thirdparty',
  estimate: 'platform.source.estimate',
};

/** How far the current plain-text output is over a platform's limit, or null when it is fine. */
export function overLimit(text: string): { label: string; used: number; limit: number } | null {
  const p = findPlatform(state.platform);
  if (!p || p.limit === null) return null;
  const used = countOf(text, p.counter);
  return used > p.limit ? { label: platformLabel(p), used, limit: p.limit } : null;
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
  const label = platformLabel(p);
  const title =
    p.limit === null
      ? t('platform.titleEstimate', { label })
      : t('platform.titleLimit', { label, limit: p.limit });
  const size = t(p.source === 'estimate' ? 'platform.size.estimate' : 'platform.size.derived', {
    cols,
    rows,
  });
  return [
    paragraph(title, platformRule(p)),
    paragraph(t('platform.heading.source'), t(SOURCE_KEY[p.source])),
    paragraph(t('platform.heading.size'), size),
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

  /** the drop-down entries (platform names are localised) and the open platform's help text */
  const renderTexts = () => {
    select.querySelectorAll('option[data-platform]').forEach((o) => o.remove());
    for (const p of PLATFORMS) {
      const { cols, rows } = presetGrid(p);
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.dataset.platform = '1';
      opt.textContent = `${platformLabel(p)} · ${cols} × ${rows}`;
      select.append(opt);
    }
    select.value = state.platform ?? '';
    const current = findPlatform(state.platform);
    tipBox.replaceChildren(...(current ? describe(current) : []));
  };
  renderTexts();

  // the text a copy would produce, counted the platform's way; skip DOM writes when nothing changed
  let shown = '';
  const update = () => {
    const p = findPlatform(state.platform);
    const limit = p?.limit ?? null;
    if (p && limit !== null) {
      const used = countOf(exportCurrent('text'), p.counter),
        over = used > limit;
      const key = `${p.id}|${used}`;
      if (key !== shown) {
        shown = key;
        count.textContent = t('platform.used', { used, limit }) + (over ? t('platform.over') : '');
        compact.textContent = ` · ${used}/${limit}`;
        box.classList.toggle('over', over);
        compact.classList.toggle('over', over);
      }
    } else {
      shown = '';
    }
    // text first, so the block animates open at its final height
    reveal(box, limit !== null, 'collapse');
    reveal(compact, limit !== null, 'fade');
  };

  select.onchange = () => {
    const p = findPlatform(select.value);
    state.platform = p?.id ?? null;
    document.dispatchEvent(new Event('platformchange'));
    tip.close();
    reveal(tipBtn, !!p, 'fade');
    tipBox.replaceChildren(...(p ? describe(p) : []));
    if (p) {
      pushUndo();
      setGrid(presetGrid(p), 'scale');
    }
    shown = '';
    update();
  };

  // start on the general small size: the first layout already uses its grid (no undo step, no motion)
  const initial = findPlatform(START_PLATFORM);
  if (initial) {
    state.platform = initial.id;
    state.fixed = { ...presetGrid(initial) };
    select.value = initial.id;
    tipBtn.hidden = false;
    renderTexts();
  }
  document.addEventListener('langchange', () => {
    renderTexts();
    shown = ''; // the readout is written again in the new language
    update();
  });

  document.addEventListener('rendered', update);
  document.addEventListener('exportchange', () => {
    shown = '';
    update();
  });
  update();
}
