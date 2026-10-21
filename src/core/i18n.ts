/**
 * Minimal string table. UI code asks for a key; the active language supplies
 * the words. Missing keys fall back to English, then to the key itself.
 *
 * English is bundled; every other language is fetched on demand. Shipping all
 * of them to everyone means most players download a table they will never
 * read, and the Greek one alone is nearly a hundred kilobytes of source. Until
 * a table arrives the fallback to English keeps the interface readable rather
 * than blank — which is the same behaviour a missing key already had.
 */

import { en } from './locales/en';

export type Lang = 'en' | 'el';

export const LANGS: Lang[] = ['en', 'el'];

export const LANG_LABELS: Record<Lang, string> = {
  en: 'English',
  el: 'Ελληνικά',
};

type Vars = Record<string, string | number>;

export type Dict = Record<string, string>;

const tables: Partial<Record<Lang, Dict>> = { en };

/** How to fetch each table. English is already here. */
const loaders: Record<Lang, (() => Promise<Dict>) | null> = {
  en: null,
  el: async () => (await import('./locales/el')).el,
};

const pending = new Map<Lang, Promise<void>>();

let current: Lang = 'en';

export function getLanguage(): Lang {
  return current;
}

/**
 * Make sure a language's table is in memory. Await this before the first paint
 * so a Greek player does not watch the menu start in English and then switch.
 *
 * A failed fetch resolves anyway: no translation is a far smaller problem than
 * no interface.
 */
export function ensureLanguage(lang: Lang): Promise<void> {
  if (tables[lang]) return Promise.resolve();
  const load = loaders[lang];
  if (!load) return Promise.resolve();
  let inflight = pending.get(lang);
  if (!inflight) {
    inflight = load()
      .then((dict) => {
        tables[lang] = dict;
      })
      .catch(() => undefined);
    pending.set(lang, inflight);
  }
  return inflight;
}

/**
 * Switch language now. The table may still be in flight, in which case the
 * interface reads English for a moment and then fills in.
 */
export function setLanguage(lang: Lang): void {
  current = lang in loaders ? lang : 'en';
  if (typeof document !== 'undefined') {
    document.documentElement.lang = current;
  }
  void ensureLanguage(current);
}

export function isLang(value: unknown): value is Lang {
  return value === 'en' || value === 'el';
}

/** Look up a string. Substitutes `{name}` placeholders from `vars`. */
export function t(key: string, vars?: Vars): string {
  const raw = tables[current]?.[key] ?? en[key] ?? key;
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
