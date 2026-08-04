import { DEFAULT_LOADOUT, type LoadoutSelection } from './loadout';
import { type Lang, isLang } from './i18n';
import type { Grade } from './scoring';

/**
 * What survives a refresh: the kit you own, the money you have, and the best
 * you have shot each stage. Everything is written through one function so a
 * private-mode browser with no storage simply plays without remembering.
 */

const KEY = 'coldbore.profile.v1';

export interface StageRecord {
  bestFraction: number;
  bestPoints: number;
  bestGrade: Grade;
  bestTimeS: number;
  attempts: number;
  cleared: boolean;
}

export interface Settings {
  /** Yards, inches and Fahrenheit, or the sensible ones. */
  imperial: boolean;
  /** Drag sensitivity for aiming, multiplier. */
  aimSensitivity: number;
  /** Invert the drag direction, for people who think of it as moving the rifle. */
  invertDrag: boolean;
  sound: boolean;
  /** Show the true firing solution regardless of kit. Practice mode. */
  assist: boolean;
  /** Interface language. */
  language: Lang;
}

export interface Profile {
  credits: number;
  owned: string[];
  loadout: LoadoutSelection;
  records: Record<string, StageRecord>;
  settings: Settings;
}

export const STARTING_CREDITS = 1200;

export const DEFAULT_SETTINGS: Settings = {
  imperial: false,
  aimSensitivity: 1,
  invertDrag: false,
  sound: true,
  assist: false,
  language: 'en',
};

/** Free kit. Enough to shoot the first stage and not one thing more. */
export const STARTER_KIT = [
  'ranger24',
  '308-m80',
  'opt-duplex',
  'muz-none',
  'sup-none',
];

export function defaultProfile(): Profile {
  return {
    credits: STARTING_CREDITS,
    owned: [...STARTER_KIT],
    loadout: { ...DEFAULT_LOADOUT, gearIds: [] },
    records: {},
    settings: { ...DEFAULT_SETTINGS },
  };
}

function storage(): Storage | null {
  try {
    const s = globalThis.localStorage;
    // Safari in private mode hands you a Storage that throws when you use it.
    s.setItem('coldbore.probe', '1');
    s.removeItem('coldbore.probe');
    return s;
  } catch {
    return null;
  }
}

export function loadProfile(): Profile {
  const s = storage();
  if (!s) return defaultProfile();
  try {
    const raw = s.getItem(KEY);
    if (!raw) return defaultProfile();
    const parsed = JSON.parse(raw) as Partial<Profile>;
    const base = defaultProfile();
    return {
      credits: typeof parsed.credits === 'number' ? parsed.credits : base.credits,
      owned: Array.isArray(parsed.owned)
        ? Array.from(new Set([...STARTER_KIT, ...parsed.owned]))
        : base.owned,
      loadout: { ...base.loadout, ...(parsed.loadout ?? {}) },
      records: parsed.records ?? {},
      settings: {
        ...base.settings,
        ...(parsed.settings ?? {}),
        language: isLang(parsed.settings?.language)
          ? parsed.settings.language
          : base.settings.language,
      },
    };
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(profile: Profile): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(KEY, JSON.stringify(profile));
  } catch {
    // Out of quota, or the user has storage switched off. Play on regardless.
  }
}

export const owns = (profile: Profile, id: string) => profile.owned.includes(id);

export function buy(profile: Profile, id: string, cost: number): boolean {
  if (owns(profile, id)) return true;
  if (profile.credits < cost) return false;
  profile.credits -= cost;
  profile.owned.push(id);
  return true;
}

export function recordStage(
  profile: Profile,
  stageId: string,
  fraction: number,
  points: number,
  grade: Grade,
  timeS: number,
  cleared: boolean,
): StageRecord {
  const prev = profile.records[stageId];
  const next: StageRecord = {
    bestFraction: Math.max(prev?.bestFraction ?? 0, fraction),
    bestPoints: Math.max(prev?.bestPoints ?? 0, points),
    bestGrade: (prev && prev.bestFraction >= fraction ? prev.bestGrade : grade) as Grade,
    bestTimeS:
      prev && prev.cleared && cleared ? Math.min(prev.bestTimeS, timeS) : cleared ? timeS : (prev?.bestTimeS ?? 0),
    attempts: (prev?.attempts ?? 0) + 1,
    cleared: (prev?.cleared ?? false) || cleared,
  };
  profile.records[stageId] = next;
  return next;
}
