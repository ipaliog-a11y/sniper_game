import { STAGES } from './range';
import type { Grade } from './scoring';
import { GRADE_STEPS, gradeFor } from './scoring';

/**
 * Career stats, stage run history, and achievements. Written when a string
 * ends (course, practice, Free Field). Course unlocks and credits stay in
 * store.recordStage — this module only tracks what you have done.
 *
 * Uses a slim host shape so this file does not import store (circular risk).
 */

/** Minimal profile surface achievements and summary need. */
export interface CareerHost {
  records: Record<
    string,
    {
      bestGrade: Grade;
      cleared?: boolean;
      attempts: number;
    }
  >;
  owned: string[];
  career?: Career;
}

export const HISTORY_LIMIT = 40;

export interface RunSnapshot {
  stageId: string;
  fraction: number;
  points: number;
  grade: Grade;
  timeS: number;
  cleared: boolean;
  frhPercent: number;
  meanRadialMil: number;
  hits: number;
  targets: number;
  shots: number;
  practice: boolean;
  freeField: boolean;
  /** Credits banked for this run (0 for Free Field). */
  reward: number;
}

export interface HistoryEntry extends RunSnapshot {
  at: number;
}

export interface CareerTotals {
  runs: number;
  courseRuns: number;
  freeFieldRuns: number;
  practiceRuns: number;
  shots: number;
  plateHits: number;
  plateTargets: number;
  firstRoundHits: number;
  pointsEarned: number;
  creditsEarned: number;
  elapsedS: number;
  /** Sum of (meanRadialMil × shots) for a shot-weighted career mean miss. */
  radialMilSum: number;
  radialShotCount: number;
  perfectFrhClears: number;
  distinguishedRuns: number;
}

export interface Career {
  totals: CareerTotals;
  history: HistoryEntry[];
  unlocked: string[];
  unlockedAt: Record<string, number>;
}

export type AchievementTier = 'bronze' | 'silver' | 'gold';

export interface AchievementDef {
  id: string;
  tier: AchievementTier;
  /** Pure check against profile + optional last run. */
  check: (profile: CareerHost, last?: HistoryEntry) => boolean;
}

export function emptyTotals(): CareerTotals {
  return {
    runs: 0,
    courseRuns: 0,
    freeFieldRuns: 0,
    practiceRuns: 0,
    shots: 0,
    plateHits: 0,
    plateTargets: 0,
    firstRoundHits: 0,
    pointsEarned: 0,
    creditsEarned: 0,
    elapsedS: 0,
    radialMilSum: 0,
    radialShotCount: 0,
    perfectFrhClears: 0,
    distinguishedRuns: 0,
  };
}

export function emptyCareer(): Career {
  return {
    totals: emptyTotals(),
    history: [],
    unlocked: [],
    unlockedAt: {},
  };
}

/** Ensure profile.career exists (migrates old saves). */
export function ensureCareer(profile: CareerHost): Career {
  if (!profile.career) profile.career = emptyCareer();
  if (!profile.career.totals) profile.career.totals = emptyTotals();
  if (!Array.isArray(profile.career.history)) profile.career.history = [];
  if (!Array.isArray(profile.career.unlocked)) profile.career.unlocked = [];
  if (!profile.career.unlockedAt || typeof profile.career.unlockedAt !== 'object') {
    profile.career.unlockedAt = {};
  }
  return profile.career;
}

export function isAchievementUnlocked(profile: CareerHost, id: string): boolean {
  return ensureCareer(profile).unlocked.includes(id);
}

const GRADE_RANK: Record<Grade, number> = {
  Unqualified: 0,
  Qualified: 1,
  Marksman: 2,
  Sharpshooter: 3,
  Expert: 4,
  Distinguished: 5,
};

export function gradeAtLeast(grade: Grade, min: Grade): boolean {
  return GRADE_RANK[grade] >= GRADE_RANK[min];
}

function gradedStages() {
  return STAGES.filter((s) => s.id !== 'tutorial' && s.id !== 'free-field');
}

function countGradesAtLeast(profile: CareerHost, min: Grade): number {
  let n = 0;
  for (const stage of gradedStages()) {
    const rec = profile.records[stage.id];
    if (rec && gradeAtLeast(rec.bestGrade, min)) n++;
  }
  return n;
}

function bestOn(profile: CareerHost, stageId: string) {
  return profile.records[stageId];
}

/** Achievement catalogue. Names/descriptions live in locales. */
export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_string',
    tier: 'bronze',
    check: (p) => ensureCareer(p).totals.runs >= 1,
  },
  {
    id: 'first_clear',
    tier: 'bronze',
    check: (p) => gradedStages().some((s) => p.records[s.id]?.cleared),
  },
  {
    id: 'tutorial_done',
    tier: 'bronze',
    check: (p) => Boolean(p.records.tutorial?.attempts),
  },
  {
    id: 'zero_qualified',
    tier: 'bronze',
    check: (p) => {
      const r = bestOn(p, 'zero');
      return Boolean(r && gradeAtLeast(r.bestGrade, 'Qualified'));
    },
  },
  {
    id: 'ranging_clear',
    tier: 'bronze',
    check: (p) => Boolean(p.records.ranging?.cleared),
  },
  {
    id: 'wind_clear',
    tier: 'silver',
    check: (p) => Boolean(p.records.wind?.cleared),
  },
  {
    id: 'movers_clear',
    tier: 'silver',
    check: (p) => Boolean(p.records.movers?.cleared),
  },
  {
    id: 'storm_clear',
    tier: 'silver',
    check: (p) => Boolean(p.records.storm?.cleared),
  },
  {
    id: 'mile_clear',
    tier: 'gold',
    check: (p) => Boolean(p.records.mile?.cleared),
  },
  {
    id: 'beyond_clear',
    tier: 'gold',
    check: (p) => Boolean(p.records.beyond?.cleared),
  },
  {
    id: 'two_mile_clear',
    tier: 'gold',
    check: (p) => Boolean(p.records['two-mile']?.cleared),
  },
  {
    id: 'horizon_clear',
    tier: 'gold',
    check: (p) => Boolean(p.records.horizon?.cleared),
  },
  {
    id: 'course_complete',
    tier: 'gold',
    check: (p) => gradedStages().every((s) => p.records[s.id]?.cleared),
  },
  {
    id: 'grade_marksman',
    tier: 'bronze',
    check: (p) => countGradesAtLeast(p, 'Marksman') >= 1,
  },
  {
    id: 'grade_expert',
    tier: 'silver',
    check: (p) => countGradesAtLeast(p, 'Expert') >= 1,
  },
  {
    id: 'grade_distinguished',
    tier: 'gold',
    check: (p) => countGradesAtLeast(p, 'Distinguished') >= 1,
  },
  {
    id: 'cold_bore_distinguished',
    tier: 'gold',
    check: (p) => {
      const r = bestOn(p, 'zero');
      return Boolean(r && gradeAtLeast(r.bestGrade, 'Distinguished'));
    },
  },
  {
    id: 'sharpshooter_trio',
    tier: 'silver',
    check: (p) => countGradesAtLeast(p, 'Sharpshooter') >= 3,
  },
  {
    id: 'frh_perfect',
    tier: 'gold',
    check: (_p, last) =>
      Boolean(
        last &&
          !last.freeField &&
          last.cleared &&
          last.targets >= 3 &&
          last.frhPercent >= 99.5,
      ),
  },
  {
    id: 'frh_career_50',
    tier: 'silver',
    check: (p) => {
      const t = ensureCareer(p).totals;
      return t.plateTargets >= 20 && t.firstRoundHits / t.plateTargets >= 0.5;
    },
  },
  {
    id: 'tight_group',
    tier: 'silver',
    check: (_p, last) =>
      Boolean(
        last &&
          !last.freeField &&
          last.cleared &&
          last.shots >= 3 &&
          last.meanRadialMil > 0 &&
          last.meanRadialMil <= 0.5,
      ),
  },
  {
    id: 'shots_100',
    tier: 'bronze',
    check: (p) => ensureCareer(p).totals.shots >= 100,
  },
  {
    id: 'shots_500',
    tier: 'silver',
    check: (p) => ensureCareer(p).totals.shots >= 500,
  },
  {
    id: 'credits_5k',
    tier: 'silver',
    check: (p) => ensureCareer(p).totals.creditsEarned >= 5000,
  },
  {
    id: 'free_field_run',
    tier: 'bronze',
    check: (p) => ensureCareer(p).totals.freeFieldRuns >= 1,
  },
  {
    id: 'own_tree',
    tier: 'silver',
    check: (p) =>
      p.owned.includes('opt-tree') ||
      p.owned.includes('opt-elite') ||
      p.owned.includes('opt-horizon'),
  },
  {
    id: 'full_sensors',
    tier: 'silver',
    check: (p) =>
      p.owned.includes('gear-lrf') &&
      p.owned.includes('gear-kestrel') &&
      p.owned.includes('gear-solver'),
  },
  {
    id: 'attempts_ten',
    tier: 'bronze',
    check: (p) => Object.values(p.records).some((r) => r.attempts >= 10),
  },
];

export function achievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/**
 * Re-evaluate the catalogue. Returns ids newly unlocked this pass.
 * `last` feeds run-specific medals (perfect FRH, tight group).
 */
export function unlockAchievements(profile: CareerHost, last?: HistoryEntry): string[] {
  const career = ensureCareer(profile);
  const fresh: string[] = [];
  const now = Date.now();
  for (const def of ACHIEVEMENTS) {
    if (career.unlocked.includes(def.id)) continue;
    if (!def.check(profile, last)) continue;
    career.unlocked.push(def.id);
    career.unlockedAt[def.id] = now;
    fresh.push(def.id);
  }
  return fresh;
}

/** Apply a finished string to career totals + history. Does not touch credits. */
export function appendCareerRun(profile: CareerHost, run: RunSnapshot): HistoryEntry {
  const career = ensureCareer(profile);
  const entry: HistoryEntry = { ...run, at: Date.now() };
  const t = career.totals;
  t.runs += 1;
  if (run.freeField) t.freeFieldRuns += 1;
  else t.courseRuns += 1;
  if (run.practice) t.practiceRuns += 1;
  t.shots += run.shots;
  t.plateHits += run.hits;
  t.plateTargets += run.targets;
  t.firstRoundHits += Math.round((run.frhPercent / 100) * run.targets);
  t.pointsEarned += run.points;
  t.creditsEarned += Math.max(0, run.reward);
  t.elapsedS += run.timeS;
  if (run.shots > 0) {
    t.radialMilSum += run.meanRadialMil * run.shots;
    t.radialShotCount += run.shots;
  }
  if (run.cleared && run.frhPercent >= 99.5 && run.targets >= 1) t.perfectFrhClears += 1;
  if (run.grade === 'Distinguished') t.distinguishedRuns += 1;

  career.history.unshift(entry);
  if (career.history.length > HISTORY_LIMIT) {
    career.history.length = HISTORY_LIMIT;
  }
  return entry;
}

export interface CareerSummary {
  runs: number;
  courseRuns: number;
  freeFieldRuns: number;
  shots: number;
  frhPercent: number;
  meanRadialMil: number;
  stagesCleared: number;
  stagesTotal: number;
  achievementsUnlocked: number;
  achievementsTotal: number;
  creditsEarned: number;
  bestGrade: Grade;
  pointsEarned: number;
  perfectFrhClears: number;
  distinguishedRuns: number;
}

export function careerSummary(profile: CareerHost): CareerSummary {
  const career = ensureCareer(profile);
  const t = career.totals;
  const stages = gradedStages();
  const stagesCleared = stages.filter((s) => profile.records[s.id]?.cleared).length;
  let bestRank = 0;
  let bestGrade: Grade = 'Unqualified';
  for (const stage of stages) {
    const rec = profile.records[stage.id];
    if (!rec) continue;
    const rank = GRADE_RANK[rec.bestGrade] ?? 0;
    if (rank > bestRank) {
      bestRank = rank;
      bestGrade = rec.bestGrade;
    }
  }
  return {
    runs: t.runs,
    courseRuns: t.courseRuns,
    freeFieldRuns: t.freeFieldRuns,
    shots: t.shots,
    frhPercent: t.plateTargets > 0 ? (t.firstRoundHits / t.plateTargets) * 100 : 0,
    meanRadialMil: t.radialShotCount > 0 ? t.radialMilSum / t.radialShotCount : 0,
    stagesCleared,
    stagesTotal: stages.length,
    achievementsUnlocked: career.unlocked.length,
    achievementsTotal: ACHIEVEMENTS.length,
    creditsEarned: t.creditsEarned,
    bestGrade,
    pointsEarned: t.pointsEarned,
    perfectFrhClears: t.perfectFrhClears,
    distinguishedRuns: t.distinguishedRuns,
  };
}

/** Highest grade threshold met by fraction — for history display fallback. */
export function gradeFromFraction(fraction: number): Grade {
  return gradeFor(fraction);
}

/** Sorted achievements: unlocked first (newest unlock time), then locked by catalogue order. */
export function sortedAchievements(profile: CareerHost): AchievementDef[] {
  const career = ensureCareer(profile);
  return [...ACHIEVEMENTS].sort((a, b) => {
    const ua = career.unlocked.includes(a.id);
    const ub = career.unlocked.includes(b.id);
    if (ua !== ub) return ua ? -1 : 1;
    if (ua && ub) {
      return (career.unlockedAt[b.id] ?? 0) - (career.unlockedAt[a.id] ?? 0);
    }
    return ACHIEVEMENTS.indexOf(a) - ACHIEVEMENTS.indexOf(b);
  });
}

export function tierColour(tier: AchievementTier): string {
  switch (tier) {
    case 'gold':
      return '#ffd479';
    case 'silver':
      return '#b9c4bd';
    default:
      return '#d9a86c';
  }
}

/** Export grade steps so UI can show ladder without importing scoring internals twice. */
export { GRADE_STEPS };
