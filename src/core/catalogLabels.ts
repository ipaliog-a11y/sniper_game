import { t } from './i18n';

/**
 * Resolve a catalog item's display name / blurb for the active language.
 * English (and any missing key) falls through to the string on the catalog
 * object so we do not have to mirror every load into en.ts.
 */
export function catalogName(id: string, fallback: string): string {
  const key = `catalog.${id}.name`;
  const translated = t(key);
  return translated === key ? fallback : translated;
}

export function catalogBlurb(id: string, fallback: string): string {
  const key = `catalog.${id}.blurb`;
  const translated = t(key);
  return translated === key ? fallback : translated;
}
