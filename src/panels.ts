/**
 * Panels that open inside the tray (export menu, canvas size, custom characters, platform readout)
 * push the stage shorter. In auto mode the canvas must not shrink with it, or the painting would be
 * cropped for good and the export would miss its bottom: the canvas keeps the size the stage has
 * with every panel shut, and the panels simply cover its lower edge.
 */
const panels = new Set<HTMLElement>();

/** Register a panel whose height eats into the stage while it is open. */
export const trackPanel = (el: HTMLElement): void => void panels.add(el);

/** Height currently taken from the stage by open (or opening, or closing) panels, in CSS px. */
export function panelExtra(): number {
  let sum = 0;
  for (const el of panels) {
    if (el.getClientRects().length === 0) continue; // not displayed, itself or through a parent
    // a panel inside another is already part of the outer panel's height
    if ([...panels].some((p) => p !== el && p.contains(el))) continue;
    const gap = parseFloat(getComputedStyle(el.parentElement ?? el).rowGap) || 0;
    sum +=
      el.getBoundingClientRect().height + (parseFloat(getComputedStyle(el).marginTop) || 0) + gap;
  }
  return sum;
}
