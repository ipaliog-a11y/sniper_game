import { type Profile, hydrateProfile } from './store';

/**
 * Three careers, side by side.
 *
 * Each slot is an independent profile: its own credits, kit, records and
 * history. Switching slots is a save and a load, nothing more — there is no
 * merging and nothing is shared between them except the browser they live in.
 *
 * The first slot deliberately keeps the original storage key. Everyone who has
 * ever played has their career under that name, and reusing it means they open
 * the new build already standing in slot one with everything intact, rather
 * than relying on a migration step to move it for them. It also means a build
 * from before slots existed still finds that career if it is ever served again
 * — which, with a service worker in the mix, is not hypothetical.
 */

export const SLOT_COUNT = 3;

/** Slot one's key predates slots. See the note above before changing it. */
const SLOT_KEYS = ['coldbore.profile.v1', 'coldbore.slot.v1.2', 'coldbore.slot.v1.3'] as const;

const META_KEY = 'coldbore.slots.v1';

export interface SlotMeta {
  /** Epoch ms of the last save into this slot, 0 if never. */
  savedAt: number;
}

interface SlotsFile {
  active: number;
  meta: SlotMeta[];
}

/** Everything the slot picker needs to draw a row without loading a profile. */
export interface SlotSummary {
  index: number;
  empty: boolean;
  savedAt: number;
  credits: number;
  /** Graded stages cleared; the tutorial is practice and does not count. */
  cleared: number;
  /** Stages with at least one attempt, so a touched-but-uncleared slot shows. */
  attempted: number;
  active: boolean;
}

function storage(): Storage | null {
  try {
    const s = globalThis.localStorage;
    s.setItem('coldbore.probe', '1');
    s.removeItem('coldbore.probe');
    return s;
  } catch {
    return null;
  }
}

export const slotKey = (index: number): string => SLOT_KEYS[clampIndex(index)];

function clampIndex(index: number): number {
  if (!Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(SLOT_COUNT - 1, Math.floor(index)));
}

const emptyMeta = (): SlotMeta[] => Array.from({ length: SLOT_COUNT }, () => ({ savedAt: 0 }));

function readMeta(): SlotsFile {
  const base: SlotsFile = { active: 0, meta: emptyMeta() };
  const s = storage();
  if (!s) return base;
  try {
    const raw = s.getItem(META_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<SlotsFile>;
    const meta = emptyMeta();
    if (Array.isArray(parsed.meta)) {
      for (let i = 0; i < SLOT_COUNT; i++) {
        const entry = parsed.meta[i] as Partial<SlotMeta> | undefined;
        if (!entry) continue;
        meta[i] = {
          savedAt:
            typeof entry.savedAt === 'number' && Number.isFinite(entry.savedAt) ? entry.savedAt : 0,
        };
      }
    }
    return { active: clampIndex(parsed.active ?? 0), meta };
  } catch {
    return base;
  }
}

function writeMeta(file: SlotsFile): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(META_KEY, JSON.stringify(file));
  } catch {
    // No quota, or storage is off. The slot bodies are what matter; without
    // this file they simply read as unnamed and slot one is active.
  }
}

export function activeSlot(): number {
  return readMeta().active;
}

export function setActiveSlot(index: number): void {
  const file = readMeta();
  file.active = clampIndex(index);
  writeMeta(file);
}

/** Raw profile in a slot, or null if that slot has never been written. */
export function readSlot(index: number): Profile | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(slotKey(index));
    if (!raw) return null;
    return hydrateProfile(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeSlot(index: number, profile: Profile): void {
  const s = storage();
  if (!s) return;
  const i = clampIndex(index);
  try {
    s.setItem(slotKey(i), JSON.stringify(profile));
  } catch {
    // Out of quota or storage is off: play on, just without remembering.
    return;
  }
  const file = readMeta();
  file.meta[i] = { savedAt: Date.now() };
  writeMeta(file);
}

/** Wipe a slot back to untouched. Does not change which slot is active. */
export function clearSlot(index: number): void {
  const s = storage();
  if (!s) return;
  const i = clampIndex(index);
  try {
    s.removeItem(slotKey(i));
  } catch {
    return;
  }
  const file = readMeta();
  file.meta[i] = { savedAt: 0 };
  writeMeta(file);
}

/** Copy one slot over another. Used to fork a career before trying something. */
export function copySlot(from: number, to: number): boolean {
  const profile = readSlot(from);
  if (!profile || clampIndex(from) === clampIndex(to)) return false;
  writeSlot(to, profile);
  return true;
}

/**
 * One row per slot for the picker.
 *
 * Reads and hydrates all three profiles, which is a few hundred microseconds
 * of JSON and only happens on a screen that is not animating anything.
 */
export function slotSummaries(
  gradedStageIds: string[],
  /**
   * The career currently in hand, which may have moved on since it was last
   * written. Passed in rather than saved first: a screen that writes to the
   * active slot on every frame is one ordering mistake away from writing it to
   * the wrong one, and that mistake costs somebody their whole course of fire.
   */
  live: Profile | null = null,
): SlotSummary[] {
  const file = readMeta();
  return Array.from({ length: SLOT_COUNT }, (_, index) => {
    const stored = readSlot(index);
    const profile = index === file.active && live ? live : stored;
    const records = profile?.records ?? {};
    return {
      index,
      empty: profile === null,
      savedAt: file.meta[index].savedAt,
      credits: profile?.credits ?? 0,
      cleared: gradedStageIds.filter((id) => records[id]?.cleared).length,
      attempted: gradedStageIds.filter((id) => (records[id]?.attempts ?? 0) > 0).length,
      active: index === file.active,
    };
  });
}
