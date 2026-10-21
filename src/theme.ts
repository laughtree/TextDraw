import { lumOfCss } from './color';

/** Computed value of a CSS custom property on the root element. */
export function css(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export const lumOfToken = (name: string): number => lumOfCss(css(name));
