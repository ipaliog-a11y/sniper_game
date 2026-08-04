/**
 * Minimal string table. UI code asks for a key; the active language supplies
 * the words. Missing keys fall back to English, then to the key itself.
 */

export type Lang = 'en' | 'el';

export const LANGS: Lang[] = ['en', 'el'];

export const LANG_LABELS: Record<Lang, string> = {
  en: 'English',
  el: 'Ελληνικά',
};

type Vars = Record<string, string | number>;

export type Dict = Record<string, string>;

import { en } from './locales/en';
import { el } from './locales/el';

const tables: Record<Lang, Dict> = { en, el };

let current: Lang = 'en';

export function getLanguage(): Lang {
  return current;
}

export function setLanguage(lang: Lang): void {
  current = lang in tables ? lang : 'en';
  if (typeof document !== 'undefined') {
    document.documentElement.lang = current;
  }
}

export function isLang(value: unknown): value is Lang {
  return value === 'en' || value === 'el';
}

/** Look up a string. Substitutes `{name}` placeholders from `vars`. */
export function t(key: string, vars?: Vars): string {
  const raw = tables[current][key] ?? tables.en[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] !== undefined ? String(vars[name]) : `{${name}}`,
  );
}

/** Cycle en → el → en. */
export function nextLanguage(lang: Lang = current): Lang {
  const i = LANGS.indexOf(lang);
  return LANGS[(i + 1) % LANGS.length];
}
