import { itemDetailById } from './catalog/itemDetails';
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

/** Role line for the detail window (e.g. chambering / optic class). */
export function catalogRole(id: string): string {
  const fallback = itemDetailById(id)?.role ?? '';
  const key = `catalog.${id}.role`;
  const translated = t(key);
  return translated === key ? fallback : translated;
}

/** Long-form description for the detail window. */
export function catalogDetail(id: string): string {
  const fallback = itemDetailById(id)?.detail ?? '';
  const key = `catalog.${id}.detail`;
  const translated = t(key);
  return translated === key ? fallback : translated;
}

/** Field notes under the long description. */
export function catalogNotes(id: string): string[] {
  const base = itemDetailById(id)?.notes ?? [];
  return base.map((fallback, i) => {
    const key = `catalog.${id}.note.${i}`;
    const translated = t(key);
    return translated === key ? fallback : translated;
  });
}
