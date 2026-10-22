import { t, type Key } from '../i18n';
import { en } from '../i18n/en';
import type { Platform } from '../platforms';

/** The platform's name in the current language; brand names are the same in every language. */
export function platformLabel(p: Platform): string {
  const key = `platform.${p.id}.label`;
  return key in en ? t(key as Key) : p.label;
}

/** One line on how the platform counts, from the dictionary. */
export const platformRule = (p: Platform): string => t(`platform.${p.id}.rule` as Key);
