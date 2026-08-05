import {
  type Career,
  type RunSnapshot,
  appendCareerRun,
  emptyCareer,
  ensureCareer,
  unlockAchievements,
} from './career';
import { DEFAULT_LOADOUT, type LoadoutSelection } from './loadout';
import { type Lang, isLang } from './i18n';
import type { Grade } from './scoring';

/**
 * What survives a refresh: the kit you own, the money you have, and the best
 * you have shot each stage. Everything is written through one function so a
 * private-mode browser with no storage simply plays without remembering.
 */

const KEY = 'coldbore.profile.v1';

/** File backup envelope so imports can be distinguished from raw profile dumps. */
export const SAVE_FORMAT = 'coldbore-save';
export const SAVE_VERSION = 1;

export interface SaveEnvelope {
  format: typeof SAVE_FORMAT;
  version: number;
  exportedAt: number;
  profile: Profile;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export interface StageRecord {
  bestFraction: number;
  bestPoints: number;
  bestGrade: Grade;
  bestTimeS: number;
  attempts: number;
  cleared: boolean;
  /** Best first-round hit % on this stage (course only). */
  bestFrhPercent?: number;
  /** Best (lowest) mean radial miss, mils, when the stage was cleared. */
  bestMeanRadialMil?: number;
  lastPlayedAt?: number;
}

/** How the shoot scene is driven: finger-friendly buttons, or mouse bindings. */
export type ControlMode = 'touch' | 'mouse';

export const CONTROL_MODES: ControlMode[] = ['touch', 'mouse'];

export const CONTROL_MODE_LABELS: Record<ControlMode, string> = {
  touch: 'Touch',
  mouse: 'Mouse',
};

export function isControlMode(value: unknown): value is ControlMode {
  return value === 'touch' || value === 'mouse';
}

export function nextControlMode(mode: ControlMode): ControlMode {
  const i = CONTROL_MODES.indexOf(mode);
  return CONTROL_MODES[(i + 1) % CONTROL_MODES.length];
}

/** Prefer mouse on fine-pointer desktops; phones stay on touch. */
export function defaultControlMode(): ControlMode {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'touch';
  try {
    if (window.matchMedia('(pointer: fine)').matches) return 'mouse';
  } catch {
    /* matchMedia can throw in odd embeds */
  }
  return 'touch';
}

export interface Settings {
  /** Yards, inches and Fahrenheit, or the sensible ones. */
  imperial: boolean;
  /** Drag sensitivity for aiming, multiplier. */
  aimSensitivity: number;
  /** Invert the drag direction, for people who think of it as moving the rifle. */
  invertDrag: boolean;
  /** Master audio on/off. When false, nothing is heard. */
  sound: boolean;
  /**
   * Master volume 0..1 (only applies when sound is on). Default 1 = full
   * internal headroom; the engine still soft-limits peaks.
   */
  masterVolume: number;
  /** Shots, impacts, bolt, UI ticks. */
  soundSfx: boolean;
  /** Ambient wind / environment bed. */
  soundEnv: boolean;
  /** Show the true firing solution regardless of kit. Practice mode. */
  assist: boolean;
  /** Interface language. */
  language: Lang;
  /**
   * Shoot controls. Touch keeps HOLD/FIRE on the toolbar; mouse uses the
   * wheel for zoom, right-hold for breath, and left-click to fire.
   */
  controlMode: ControlMode;
  /**
   * Temporary debug: armoury prices show and charge 0 credits so kit can be
   * tried without grinding. Not a permanent unlock — turn off anytime.
   */
  debugFreeShop: boolean;
}

export interface Profile {
  credits: number;
  owned: string[];
  loadout: LoadoutSelection;
  records: Record<string, StageRecord>;
  settings: Settings;
  /** Lifetime stats, run history, and achievement unlocks. */
  career: Career;
}

export interface BankRunResult {
  record: StageRecord | null;
  newAchievements: string[];
}

export const STARTING_CREDITS = 1200;

export const DEFAULT_SETTINGS: Settings = {
  imperial: false,
  aimSensitivity: 1,
  invertDrag: false,
  sound: true,
  masterVolume: 1,
  soundSfx: true,
  soundEnv: true,
  assist: false,
  language: 'en',
  controlMode: 'touch',
  debugFreeShop: false,
};

/** Fresh profile; control mode picks mouse on desktop when the DOM is there. */
export function defaultProfile(): Profile {
  return {
    credits: STARTING_CREDITS,
    owned: [...STARTER_KIT],
    loadout: { ...DEFAULT_LOADOUT, gearIds: [] },
    records: {},
    settings: { ...DEFAULT_SETTINGS, controlMode: defaultControlMode() },
    career: emptyCareer(),
  };
}

/** Free kit. Enough to shoot the first stage and not one thing more. */
export const STARTER_KIT = [
  'ranger24',
  '308-m80',
  'opt-duplex',
  'muz-none',
  'sup-none',
];

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

/**
 * Coerce any partial / legacy JSON into a playable Profile. Shared by localStorage
 * load and file import so recovery uses the same migration rules.
 */
export function hydrateProfile(parsed: unknown): Profile {
  const base = defaultProfile();
  if (!parsed || typeof parsed !== 'object') return base;
  const p = parsed as Partial<Profile>;
  const profile: Profile = {
    credits: typeof p.credits === 'number' && Number.isFinite(p.credits) ? p.credits : base.credits,
    owned: Array.isArray(p.owned)
      ? Array.from(new Set([...STARTER_KIT, ...p.owned.filter((id) => typeof id === 'string')]))
      : base.owned,
    loadout: { ...base.loadout, ...(p.loadout ?? {}) },
    records:
      p.records && typeof p.records === 'object' && !Array.isArray(p.records)
        ? (p.records as Profile['records'])
        : {},
    settings: {
      ...base.settings,
      ...(p.settings ?? {}),
      language: isLang(p.settings?.language) ? p.settings.language : base.settings.language,
      controlMode: isControlMode(p.settings?.controlMode)
        ? p.settings.controlMode
        : base.settings.controlMode,
      debugFreeShop: Boolean(p.settings?.debugFreeShop),
      sound: p.settings?.sound !== false,
      masterVolume: clamp01(
        typeof p.settings?.masterVolume === 'number'
          ? p.settings.masterVolume
          : base.settings.masterVolume,
      ),
      soundSfx: p.settings?.soundSfx !== false,
      soundEnv: p.settings?.soundEnv !== false,
      aimSensitivity:
        typeof p.settings?.aimSensitivity === 'number' && Number.isFinite(p.settings.aimSensitivity)
          ? Math.max(0.3, Math.min(2.5, p.settings.aimSensitivity))
          : base.settings.aimSensitivity,
      invertDrag: Boolean(p.settings?.invertDrag),
      imperial: Boolean(p.settings?.imperial),
      assist: Boolean(p.settings?.assist),
    },
    career: migrateCareer(p.career),
  };
  ensureCareer(profile);
  return profile;
}

export function loadProfile(): Profile {
  const s = storage();
  if (!s) return defaultProfile();
  try {
    const raw = s.getItem(KEY);
    if (!raw) return defaultProfile();
    return hydrateProfile(JSON.parse(raw));
  } catch {
    return defaultProfile();
  }
}

function migrateCareer(raw: unknown): Career {
  if (!raw || typeof raw !== 'object') return emptyCareer();
  const c = raw as Partial<Career>;
  const base = emptyCareer();
  return {
    totals: { ...base.totals, ...(c.totals ?? {}) },
    history: Array.isArray(c.history) ? c.history.slice(0, 40) : [],
    unlocked: Array.isArray(c.unlocked) ? c.unlocked.filter((id) => typeof id === 'string') : [],
    unlockedAt:
      c.unlockedAt && typeof c.unlockedAt === 'object'
        ? (c.unlockedAt as Record<string, number>)
        : {},
  };
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

/** Build a portable JSON backup (pretty-printed for hand-editing if needed). */
export function serializeSave(profile: Profile): string {
  const envelope: SaveEnvelope = {
    format: SAVE_FORMAT,
    version: SAVE_VERSION,
    exportedAt: Date.now(),
    profile,
  };
  return JSON.stringify(envelope, null, 2);
}

/**
 * Parse an export file or a raw profile dump. Returns null if the text is not
 * usable JSON or does not look like Cold Bore progress.
 */
export function parseSaveJson(raw: string): Profile | null {
  try {
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== 'object') return null;
    const obj = data as Record<string, unknown>;
    // Preferred: versioned envelope from Export.
    if (obj.format === SAVE_FORMAT && obj.profile && typeof obj.profile === 'object') {
      return hydrateProfile(obj.profile);
    }
    // Raw profile (e.g. copied from localStorage DevTools).
    if (
      'credits' in obj ||
      'owned' in obj ||
      'records' in obj ||
      'loadout' in obj ||
      'career' in obj
    ) {
      return hydrateProfile(obj);
    }
    return null;
  } catch {
    return null;
  }
}

/** Suggested download filename, e.g. coldbore-save-2026-08-05.json */
export function saveFilename(when = new Date()): string {
  const y = when.getFullYear();
  const m = String(when.getMonth() + 1).padStart(2, '0');
  const d = String(when.getDate()).padStart(2, '0');
  return `coldbore-save-${y}-${m}-${d}.json`;
}

/**
 * Trigger a browser download of the current profile. No-op outside a document
 * (tests). Returns the filename used, or null if download could not start.
 */
export function downloadProfileSave(profile: Profile): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const json = serializeSave(profile);
    const name = saveFilename();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoke after the download has a chance to start.
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return name;
  } catch {
    return null;
  }
}

/**
 * Open a file picker and parse a Cold Bore save. Resolves null if cancelled
 * or the file is invalid.
 */
export function pickAndReadSaveFile(): Promise<Profile | null> {
  if (typeof document === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json,text/json';
    input.style.display = 'none';
    let settled = false;
    const finish = (value: Profile | null) => {
      if (settled) return;
      settled = true;
      try {
        document.body.removeChild(input);
      } catch {
        /* already detached */
      }
      resolve(value);
    };
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        finish(null);
        return;
      }
      file
        .text()
        .then((text) => finish(parseSaveJson(text)))
        .catch(() => finish(null));
    });
    // Some browsers fire focus without change when the dialog is cancelled.
    window.addEventListener(
      'focus',
      () => {
        setTimeout(() => {
          if (!settled && !input.files?.length) finish(null);
        }, 400);
      },
      { once: true },
    );
    document.body.appendChild(input);
    input.click();
  });
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
  extras: { frhPercent?: number; meanRadialMil?: number } = {},
): StageRecord {
  const prev = profile.records[stageId];
  const next: StageRecord = {
    bestFraction: Math.max(prev?.bestFraction ?? 0, fraction),
    bestPoints: Math.max(prev?.bestPoints ?? 0, points),
    bestGrade: (prev && prev.bestFraction >= fraction ? prev.bestGrade : grade) as Grade,
    bestTimeS:
      prev && prev.cleared && cleared
        ? Math.min(prev.bestTimeS, timeS)
        : cleared
          ? timeS
          : (prev?.bestTimeS ?? 0),
    attempts: (prev?.attempts ?? 0) + 1,
    cleared: (prev?.cleared ?? false) || cleared,
    lastPlayedAt: Date.now(),
  };
  if (typeof extras.frhPercent === 'number') {
    next.bestFrhPercent = Math.max(prev?.bestFrhPercent ?? 0, extras.frhPercent);
  } else if (prev?.bestFrhPercent != null) {
    next.bestFrhPercent = prev.bestFrhPercent;
  }
  if (typeof extras.meanRadialMil === 'number' && cleared && extras.meanRadialMil > 0) {
    const prior = prev?.bestMeanRadialMil;
    next.bestMeanRadialMil =
      prior != null && prior > 0 ? Math.min(prior, extras.meanRadialMil) : extras.meanRadialMil;
  } else if (prev?.bestMeanRadialMil != null) {
    next.bestMeanRadialMil = prev.bestMeanRadialMil;
  }
  profile.records[stageId] = next;
  return next;
}

/**
 * Bank a finished string: career totals/history, course bests when applicable,
 * and newly unlocked achievements. Caller still awards credits for course runs.
 */
export function bankRun(profile: Profile, run: RunSnapshot): BankRunResult {
  const entry = appendCareerRun(profile, run);
  let record: StageRecord | null = null;
  if (!run.freeField) {
    record = recordStage(
      profile,
      run.stageId,
      run.fraction,
      run.points,
      run.grade,
      run.timeS,
      run.cleared,
      { frhPercent: run.frhPercent, meanRadialMil: run.meanRadialMil },
    );
  }
  const newAchievements = unlockAchievements(profile, entry);
  return { record, newAchievements };
}

/** Re-check kit and long-term achievements without a new run (e.g. after a buy). */
export function refreshAchievements(profile: Profile): string[] {
  return unlockAchievements(profile);
}
