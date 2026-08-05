import { degToRad, milsFromRange } from './units';

/**
 * The range itself: what is out there, how far, how big, and how it is scored.
 *
 * A target's `knownSizeM` is the dimension the shooter is allowed to assume —
 * a standard 66 cm IPSC torso, a 30 cm gong — because that is the number you
 * divide by when you range it off the reticle.
 */

export type TargetShape = 'gong' | 'silhouette' | 'head' | 'diamond';

export interface Target {
  id: string;
  shape: TargetShape;
  /** Slant range from the muzzle, metres. What a rangefinder would read. */
  rangeM: number;
  /** Bearing off the baseline, radians. Positive is right. */
  azimuth: number;
  /** Height of the ground the target stands on, relative to the range floor. */
  heightM: number;
  /** Full width and height of the plate, metres. */
  widthM: number;
  tallM: number;
  /**
   * The dimension the shooter is told to range off, metres. Usually the height.
   * Getting this wrong is the classic way to be 200 m out on a first shot.
   */
  knownSizeM: number;
  /** Label on the target board. */
  label?: string;
  /**
   * When true the shooter is told the range without a rangefinder (Free Field
   * known-distance plates, and any future “marked” stages). Pre-seeds session.known.
   */
  disclosedRange?: boolean;
  /** Targets can be worth more than each other. */
  value: number;
  /** Seconds the target is exposed, from the moment it appears. Infinity if static. */
  exposureS?: number;
  /** Seconds after stage start before it appears. */
  appearsAtS?: number;
  /** Metres per second of lateral travel, for movers. */
  moverSpeed?: number;
  /** Half-width of the mover's track, metres. */
  moverSpanM?: number;
}

export interface Stage {
  id: string;
  name: string;
  brief: string;
  presetId: string;
  /**
   * Scenery set: open field, forest, desert, or urban fringe. Colours the
   * ground and plants soft props that lean with the wind.
   */
  biomeId?: string;
  /**
   * How high the firing position sits above the range floor, metres. Shooting
   * off a hillside is what stops the whole range collapsing into one line at
   * the horizon — and it is where a sniper would be anyway.
   */
  firingHeightM: number;
  /** Fixed seed so the stage plays the same way twice. */
  seed: number;
  targets: Target[];
  /** Rounds allowed. Running dry is a stage failure. */
  rounds: number;
  /** Seconds for the whole course of fire. */
  timeLimitS: number;
  /** Seconds per target below which you earn full speed marks. */
  parPerTargetS: number;
  /** Must be engaged left to right, in the order listed. */
  ordered: boolean;
  /** Payout for a clean run, before bonuses. */
  reward: number;
  /** Score needed on the previous stage to unlock this one, 0..1. */
  unlockScore: number;
  /**
   * Built by Free Field setup rather than the fixed Course of Fire list.
   * Timeless count-up clock; no unlock ladder or credit farming.
   */
  freeField?: boolean;
}

/** Angular size of a target's known dimension, mils, at its true range. */
export const targetMils = (target: Target) => milsFromRange(target.knownSizeM, target.rangeM);

/** Plates and boards stand this far off the ground on their frames. */
export const STAND_HEIGHT_M = 0.4;

/** Height of the target's centre above the range floor, metres. */
export const targetCentreHeight = (target: Target) =>
  target.heightM + STAND_HEIGHT_M + target.tallM / 2;

/**
 * Line-of-sight inclination to a target, radians. Uphill is positive. Shooting
 * down into a valley and up onto a ridge both need less elevation than the
 * flat-ground card says, and for the same reason.
 */
export const targetInclination = (target: Target, firingHeightM: number) =>
  Math.asin(
    Math.max(
      -1,
      Math.min(1, (targetCentreHeight(target) - firingHeightM) / Math.max(1, target.rangeM)),
    ),
  );

/** Where the target's centre is, in metres, at a given stage time. */
export function targetOffsetAt(target: Target, t: number): number {
  if (!target.moverSpeed || !target.moverSpanM) return 0;
  const period = (4 * target.moverSpanM) / target.moverSpeed;
  const phase = (t % period) / period;
  // Triangle wave: out, back, out again.
  const tri = phase < 0.5 ? phase * 4 - 1 : 3 - phase * 4;
  return tri * target.moverSpanM;
}

/**
 * Is this impact a hit, and how good a one? Returns 0..1 where 1 is dead
 * centre, or null for a miss. Offsets are metres in the target's own plane.
 */
export function scoreImpact(target: Target, right: number, up: number): number | null {
  const hw = target.widthM / 2;
  const hh = target.tallM / 2;
  switch (target.shape) {
    case 'gong':
    case 'head': {
      const r = Math.hypot(right / hw, up / hh);
      return r <= 1 ? 1 - r : null;
    }
    case 'diamond': {
      const r = Math.abs(right) / hw + Math.abs(up) / hh;
      return r <= 1 ? 1 - r : null;
    }
    case 'silhouette': {
      // Torso box with a narrower head box on top of it.
      const shoulder = hh * 0.42;
      const inTorso = Math.abs(right) <= hw && up <= shoulder && up >= -hh;
      const inHead = Math.abs(right) <= hw * 0.42 && up > shoulder && up <= hh;
      if (!inTorso && !inHead) return null;
      // Centre of mass sits a little below the geometric centre.
      const r = Math.hypot(right / hw, (up + hh * 0.18) / (hh * 0.55));
      return Math.max(0.05, 1 - r * 0.8);
    }
  }
}

const gong = (
  id: string,
  rangeM: number,
  azDeg: number,
  diameterM: number,
  extra: Partial<Target> = {},
): Target => ({
  id,
  shape: 'gong',
  rangeM,
  azimuth: degToRad(azDeg),
  heightM: 0,
  widthM: diameterM,
  tallM: diameterM,
  knownSizeM: diameterM,
  value: 1,
  ...extra,
});

const silhouette = (
  id: string,
  rangeM: number,
  azDeg: number,
  extra: Partial<Target> = {},
): Target => ({
  id,
  shape: 'silhouette',
  rangeM,
  azimuth: degToRad(azDeg),
  heightM: 0,
  widthM: 0.46,
  tallM: 0.76,
  knownSizeM: 0.76,
  value: 1,
  ...extra,
});

const head = (id: string, rangeM: number, azDeg: number, extra: Partial<Target> = {}): Target => ({
  id,
  shape: 'head',
  rangeM,
  azimuth: degToRad(azDeg),
  heightM: 0,
  widthM: 0.16,
  tallM: 0.22,
  knownSizeM: 0.22,
  value: 2,
  ...extra,
});

/**
 * The course of fire. Tutorial sits first so new shooters find it with the
 * rest of the string; unlockScore 0 on Cold Bore means you can skip it.
 * Then ranging, real wind, and finally past the point where the bullet stops
 * being supersonic and starts being a suggestion.
 */
export const STAGES: Stage[] = [
  {
    id: 'tutorial',
    name: '00 — First Shots',
    brief:
      'Three large plates at known distances (100, 150, 200 m), calm air, plenty of time. Learn aim, breath, fire, and dialling elevation in mils from the data card before you break the shot.',
    presetId: 'calm',
    biomeId: 'open',
    firingHeightM: 8,
    seed: 42,
    rounds: 6,
    timeLimitS: 360,
    parPerTargetS: 45,
    ordered: false,
    reward: 250,
    unlockScore: 0,
    targets: [
      gong('tut1', 100, -5, 0.45, { label: '100' }),
      gong('tut2', 150, 0, 0.42, { label: '150' }),
      gong('tut3', 200, 5, 0.4, { label: '200' }),
    ],
  },
  {
    id: 'zero',
    name: '01 — Cold Bore',
    brief:
      'Five plates at known distances inside 400 m, no wind to speak of. Confirm the rifle shoots where the card says it does.',
    presetId: 'calm',
    biomeId: 'open',
    firingHeightM: 10,
    seed: 1041,
    rounds: 7,
    timeLimitS: 180,
    parPerTargetS: 28,
    ordered: false,
    reward: 900,
    // Always open — tutorial is optional.
    unlockScore: 0,
    targets: [
      // Slightly generous plates for the zeroing stage — the lesson is the
      // card and the dope, not micro-gongs at 400 m on day one.
      gong('z1', 150, -6, 0.35, { label: '150' }),
      gong('z2', 220, -2.4, 0.35, { label: '220' }),
      gong('z3', 300, 1.2, 0.35, { label: '300' }),
      gong('z4', 360, 4.5, 0.32, { label: '360' }),
      gong('z5', 400, 7.5, 0.28, { label: '400' }),
    ],
  },
  {
    id: 'ranging',
    name: '02 — Guess Work',
    brief:
      'Unmarked distances out to 650 m. Nobody is going to tell you how far anything is. Mil the plates and do the arithmetic.',
    presetId: 'fair',
    biomeId: 'forest',
    firingHeightM: 14,
    seed: 20773,
    rounds: 8,
    timeLimitS: 210,
    parPerTargetS: 28,
    ordered: false,
    reward: 1400,
    // Match Qualified: clear most of stage 1 carefully and you move on.
    unlockScore: 0.28,
    targets: [
      silhouette('r1', 385, -8),
      gong('r2', 470, -3, 0.4),
      silhouette('r3', 528, 2),
      gong('r4', 610, 6.5, 0.3),
      silhouette('r5', 655, 10),
    ],
  },
  {
    id: 'wind',
    name: '03 — Switching Valley',
    brief:
      'Every flag on this range is telling you something different and none of them agree for long. Time your shots, or hold for the worst of it.',
    presetId: 'switch',
    biomeId: 'open',
    firingHeightM: 15,
    seed: 55501,
    rounds: 10,
    timeLimitS: 240,
    parPerTargetS: 30,
    ordered: false,
    reward: 2200,
    unlockScore: 0.38,
    targets: [
      gong('w1', 500, -9, 0.4),
      silhouette('w2', 640, -3.5),
      gong('w3', 720, 1, 0.4),
      silhouette('w4', 810, 5.5, { heightM: -14 }),
      gong('w5', 880, 10, 0.5),
    ],
  },
  {
    id: 'speed',
    name: '04 — Ten Second Drill',
    brief:
      'Plates appear and go away again. Speed is the score here. Dial once for the middle distance and hold the rest.',
    presetId: 'fair',
    biomeId: 'urban',
    firingHeightM: 14,
    seed: 90210,
    rounds: 12,
    timeLimitS: 150,
    parPerTargetS: 9,
    ordered: true,
    reward: 2600,
    unlockScore: 0.42,
    targets: [
      gong('s1', 320, -10, 0.4, { appearsAtS: 0, exposureS: 12 }),
      gong('s2', 410, -5, 0.4, { appearsAtS: 10, exposureS: 12 }),
      silhouette('s3', 505, 0, { appearsAtS: 20, exposureS: 12 }),
      gong('s4', 590, 5, 0.35, { appearsAtS: 30, exposureS: 12 }),
      silhouette('s5', 680, 10, { appearsAtS: 40, exposureS: 14 }),
      head('s6', 300, 13, { appearsAtS: 52, exposureS: 14 }),
    ],
  },
  {
    id: 'altitude',
    name: '05 — Thin Air',
    brief:
      'Two thousand metres above the sea, forty degrees on the deck, and a mirage running hard. Your data card is a work of fiction up here.',
    presetId: 'desert',
    biomeId: 'desert',
    firingHeightM: 26,
    seed: 31337,
    rounds: 10,
    timeLimitS: 260,
    parPerTargetS: 32,
    ordered: false,
    reward: 3200,
    unlockScore: 0.48,
    targets: [
      silhouette('a1', 720, -11, { heightM: 40 }),
      gong('a2', 850, -5, 0.5, { heightM: 55 }),
      silhouette('a3', 960, 1.5, { heightM: 70 }),
      gong('a4', 1080, 7, 0.5, { heightM: 84 }),
      head('a5', 640, 12, { heightM: 32 }),
    ],
  },
  {
    id: 'movers',
    name: '06 — Walking Targets',
    brief:
      'They are moving. Lead them by the time of flight and not one inch more, and remember that a mover at 700 m needs most of a metre of it.',
    presetId: 'fair',
    biomeId: 'forest',
    firingHeightM: 20,
    seed: 74123,
    rounds: 14,
    timeLimitS: 220,
    parPerTargetS: 20,
    ordered: false,
    reward: 3600,
    unlockScore: 0.52,
    targets: [
      silhouette('m1', 340, -9, { moverSpeed: 1.4, moverSpanM: 6 }),
      silhouette('m2', 470, -2, { moverSpeed: 1.8, moverSpanM: 8 }),
      silhouette('m3', 610, 5, { moverSpeed: 1.6, moverSpanM: 9 }),
      gong('m4', 700, 11, 0.4, { moverSpeed: 2.2, moverSpanM: 10 }),
    ],
  },
  {
    id: 'storm',
    name: '07 — Last Light',
    brief:
      'Freezing rain, twenty mile an hour gusts and about forty minutes of usable light. Everything about this is unfair and that is the point.',
    presetId: 'storm',
    biomeId: 'open',
    firingHeightM: 24,
    seed: 60613,
    rounds: 12,
    timeLimitS: 300,
    parPerTargetS: 35,
    ordered: false,
    reward: 4400,
    unlockScore: 0.55,
    targets: [
      silhouette('t1', 560, -12, { heightM: -20 }),
      gong('t2', 700, -6, 0.5, { heightM: -26 }),
      silhouette('t3', 830, 0, { heightM: -33 }),
      gong('t4', 950, 6, 0.5, { heightM: -40 }),
      silhouette('t5', 1050, 12, { heightM: -46 }),
    ],
  },
  {
    id: 'mile',
    name: '08 — The Mile',
    brief:
      'One thousand six hundred and nine metres. Bring something that is still supersonic when it arrives, because nothing else is going to be predictable.',
    presetId: 'calm',
    biomeId: 'desert',
    firingHeightM: 32,
    seed: 16093,
    rounds: 10,
    timeLimitS: 420,
    parPerTargetS: 60,
    ordered: true,
    reward: 6500,
    unlockScore: 0.58,
    targets: [
      gong('x1', 1100, -6, 0.9, { label: 'A' }),
      gong('x2', 1350, 0, 0.9, { label: 'B' }),
      gong('x3', 1609, 6, 1.2, { label: 'MILE' }),
    ],
  },
  {
    id: 'beyond',
    name: '09 — Beyond the Mile',
    brief:
      'Past one mile the card alone is not enough. Large steel at 1.8–2.5 km, calm desert air, and flight times measured in seconds. .338 Lapua class or better — .308 is out of its depth.',
    presetId: 'calm',
    biomeId: 'desert',
    firingHeightM: 38,
    seed: 24751,
    rounds: 10,
    timeLimitS: 540,
    parPerTargetS: 90,
    ordered: true,
    reward: 9000,
    unlockScore: 0.55,
    targets: [
      gong('b1', 1800, -5, 1.2, { label: '1.1 MI' }),
      gong('b2', 2100, 1, 1.35, { label: '1.3 MI' }),
      // ~Harrison-class distance: still a .338 problem if the load is heavy.
      gong('b3', 2475, 6, 1.5, { label: '1.5 MI' }),
    ],
  },
  {
    id: 'two-mile',
    name: '10 — Two Miles',
    brief:
      'Three thousand two hundred and eighteen metres. Drop is measured in storeys, wind in metres of hold, and Coriolis is no longer a footnote. Bring a .50 BMG or a true ELR magnum, deep glass, and a solver that knows latitude.',
    presetId: 'desert',
    biomeId: 'desert',
    firingHeightM: 48,
    seed: 32186,
    rounds: 9,
    timeLimitS: 720,
    parPerTargetS: 120,
    ordered: true,
    reward: 14000,
    unlockScore: 0.52,
    targets: [
      gong('e1', 2400, -4, 1.4, { label: '1.5 MI' }),
      gong('e2', 2800, 2, 1.6, { label: '1.7 MI' }),
      gong('e3', 3218, 7, 1.8, { label: '2 MI' }),
    ],
  },
  {
    id: 'horizon',
    name: '11 — Horizon',
    brief:
      'Three thousand five hundred and forty metres — TAC-50 class distance. Flight time near ten seconds, wind layers you cannot see, and a final plate that rewards only a full ELR stack: .50 match, deep glass, meter, solver, and patience.',
    presetId: 'calm',
    biomeId: 'desert',
    firingHeightM: 55,
    seed: 35401,
    rounds: 8,
    timeLimitS: 900,
    parPerTargetS: 150,
    ordered: true,
    reward: 20000,
    unlockScore: 0.48,
    targets: [
      gong('h1', 3000, -3, 1.7, { label: '1.9 MI' }),
      gong('h2', 3300, 2, 1.9, { label: '2.1 MI' }),
      // ~JTF2 / TAC-50 class confirmed-hit distance.
      gong('h3', 3540, 6, 2.2, { label: '2.2 MI' }),
    ],
  },
];

export const stageById = (id: string) => STAGES.find((s) => s.id === id);

/** Next stage in the course list, if any. */
export function nextCourseStage(stageId: string): Stage | null {
  const i = STAGES.findIndex((s) => s.id === stageId);
  if (i < 0 || i >= STAGES.length - 1) return null;
  return STAGES[i + 1];
}

/** First-shots tutorial stage (always available in Course of Fire). */
export const isTutorialStage = (stageId: string) => stageId === 'tutorial';

/** Free Field custom string (not part of the graded course list). */
export const isFreeFieldStage = (stageId: string) => stageId === 'free-field';

export const stageMaxRange = (stage: Stage) =>
  stage.targets.reduce((m, t) => Math.max(m, t.rangeM), 0);
