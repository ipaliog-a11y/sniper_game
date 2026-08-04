import type { Stage, Target } from './range';
import { clamp } from './units';

/**
 * Scoring. Hits have to pay first — a careful all-plates run that takes its
 * time still has to land Qualified and unlock the next stage. First-round and
 * speed are bonuses on top of that, not a second gate: they separate grades
 * (Marksman → Distinguished), not whether you "passed". Centre quality is a
 * modest polish on the hit, not half the score.
 */

export const HIT_BASE = 100;
export const HIT_CENTRE_BONUS = 25;
export const FIRST_ROUND_BONUS = 20;
export const SPEED_BONUS = 20;

export interface TargetScore {
  targetId: string;
  hit: boolean;
  /** 0..1 centring of the best hit on this target. */
  quality: number;
  /** True if the first round sent at this target hit it. */
  firstRound: boolean;
  /** Seconds from the target becoming available to the hit. */
  timeToHitS: number;
  /** Rounds spent on this target. */
  rounds: number;
  points: number;
  maxPoints: number;
}

export interface StageScore {
  points: number;
  maxPoints: number;
  /** 0..1. */
  fraction: number;
  grade: Grade;
  hits: number;
  targets: number;
  shots: number;
  firstRoundHits: number;
  /** First round hit percentage, the number that actually matters. */
  frhPercent: number;
  elapsedS: number;
  /** Mean radial miss across every round, mils. */
  meanRadialMil: number;
  reward: number;
  perTarget: TargetScore[];
  cleared: boolean;
}

export type Grade =
  | 'Distinguished'
  | 'Expert'
  | 'Sharpshooter'
  | 'Marksman'
  | 'Qualified'
  | 'Unqualified';

const GRADE_STEPS: Array<[number, Grade]> = [
  [0.92, 'Distinguished'],
  [0.80, 'Expert'],
  [0.65, 'Sharpshooter'],
  [0.48, 'Marksman'],
  [0.28, 'Qualified'],
];

export function gradeFor(fraction: number): Grade {
  for (const [threshold, grade] of GRADE_STEPS) {
    if (fraction >= threshold) return grade;
  }
  return 'Unqualified';
}

export const maxPointsForTarget = (target: Target) =>
  target.value * (HIT_BASE + HIT_CENTRE_BONUS) + FIRST_ROUND_BONUS + SPEED_BONUS;

/**
 * Points a single engaged target is worth given how well and how fast it went.
 * When `timeless` is true (practice mode), the full speed bonus is always paid —
 * taking your time no longer costs points or credits.
 */
export function scoreTarget(
  target: Target,
  hit: boolean,
  quality: number,
  firstRound: boolean,
  timeToHitS: number,
  parS: number,
  rounds: number,
  timeless = false,
): TargetScore {
  const maxPoints = maxPointsForTarget(target);
  if (!hit) {
    return {
      targetId: target.id,
      hit: false,
      quality: 0,
      firstRound: false,
      timeToHitS: 0,
      rounds,
      points: 0,
      maxPoints,
    };
  }
  // Soft curve: edge hits still collect most of the centre bonus. Linear
  // quality punished rim strikes almost as hard as misses used to.
  const q = Math.sqrt(clamp(quality, 0, 1));
  const accuracy = target.value * (HIT_BASE + HIT_CENTRE_BONUS * q);
  // Full speed through ~0.5× par; fades out by ~2.2× par. Practice pays full.
  const speed = timeless
    ? SPEED_BONUS
    : SPEED_BONUS * clamp(1 - (timeToHitS - parS * 0.5) / (parS * 1.7), 0, 1);
  const first = firstRound ? FIRST_ROUND_BONUS : 0;
  return {
    targetId: target.id,
    hit: true,
    quality,
    firstRound,
    timeToHitS,
    rounds,
    points: Math.round(accuracy + speed + first),
    maxPoints,
  };
}

export function scoreStage(
  stage: Stage,
  perTarget: TargetScore[],
  shots: number,
  elapsedS: number,
  meanRadialMil: number,
): StageScore {
  const points = perTarget.reduce((s, t) => s + t.points, 0);
  const maxPoints = stage.targets.reduce((s, t) => s + maxPointsForTarget(t), 0);
  const fraction = maxPoints === 0 ? 0 : clamp(points / maxPoints, 0, 1);
  const hits = perTarget.filter((t) => t.hit).length;
  const firstRoundHits = perTarget.filter((t) => t.firstRound).length;
  const cleared = hits === stage.targets.length;
  return {
    points,
    maxPoints,
    fraction,
    grade: gradeFor(fraction),
    hits,
    targets: stage.targets.length,
    shots,
    firstRoundHits,
    frhPercent: stage.targets.length ? (firstRoundHits / stage.targets.length) * 100 : 0,
    elapsedS,
    meanRadialMil,
    // A clean run pays the advertised reward; a partial one pays its share, and
    // shooting the stage dry to get there eats into it.
    reward: Math.round(stage.reward * fraction * (cleared ? 1.25 : 1)),
    perTarget,
    cleared,
  };
}

export function gradeColour(grade: Grade): string {
  switch (grade) {
    case 'Distinguished':
      return '#ffd479';
    case 'Expert':
      return '#8fe388';
    case 'Sharpshooter':
      return '#7fd4e8';
    case 'Marksman':
      return '#b9c4bd';
    case 'Qualified':
      return '#d9a86c';
    default:
      return '#e0705f';
  }
}
