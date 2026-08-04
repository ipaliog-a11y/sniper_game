import { ICAO } from './atmosphere';
import { type Environment, type FiringSolution, solve, zeroAngle } from './ballistics';
import { type LoadoutSelection, type ResolvedLoadout, resolveLoadout } from './loadout';
import { type Stage, type Target, stageMaxRange, targetInclination, targetOffsetAt } from './range';
import { type Rng, makeRng } from './rng';
import { type StageScore, type TargetScore, scoreStage, scoreTarget } from './scoring';
import { type Dope, type ScopeState, buildDope, initialScope } from './scope';
import { type BarrelState, type ShotResult, coldBoreOffset, freshBarrel, resolveShot } from './shot';
import { clamp, radToMil } from './units';
import { type Conditions, effectiveWind, generateConditions, presetById } from './weather';

/**
 * One trip to the range. Holds the stage, the conditions rolled for it, the
 * state of every plate and every round fired, and the clock that all of it is
 * scored against.
 */

export interface TargetRuntime {
  target: Target;
  /** Stage clock at which it became engageable. */
  availableAtS: number;
  /** Stage clock at which it stopped being engageable, or Infinity. */
  goneAtS: number;
  hit: boolean;
  quality: number;
  roundsSent: number;
  hitAtS: number;
  firstRound: boolean;
}

export type SessionPhase = 'prep' | 'live' | 'complete';

export interface Session {
  stage: Stage;
  loadout: ResolvedLoadout;
  conditions: Conditions;
  dope: Dope;
  /** Bore-to-sight angle established when the rifle was zeroed, radians. */
  zero: number;
  scope: ScopeState;
  barrel: BarrelState;
  coldBore: { up: number; right: number };
  rng: Rng;
  phase: SessionPhase;
  clockS: number;
  roundsLeft: number;
  targets: TargetRuntime[];
  shots: Array<{ shot: ShotResult; atS: number; targetId: string | null }>;
  /** Ranges the player has confirmed, by target id. Ranging is a skill here. */
  known: Record<string, number>;
  /**
   * Practice mode: full solutions, no stage time limit, and speed does not
   * cost points. Snapshotted at session start so flipping settings mid-stage
   * does not rewrite the run.
   */
  practice: boolean;
  /**
   * Free Field custom string: timeless like practice, but the HUD clock counts
   * up and the run does not bank course credits or unlocks.
   */
  freeField: boolean;
}

export function createSession(
  stage: Stage,
  selection: LoadoutSelection,
  practice = false,
  freeField = false,
): Session {
  const isFree = freeField || Boolean(stage.freeField) || stage.id === 'free-field';
  // Free Field is always timeless; practice assist setting also forces timeless.
  const timeless = practice || isFree;
  const conditions = generateConditions(
    presetById(stage.presetId),
    stage.seed,
    stageMaxRange(stage),
  );
  // The loadout is resolved against today's air, not a catalogue page: cold
  // powder is slow powder, and a marginal twist gets more marginal in it.
  const loadout = resolveLoadout(selection, conditions.atmosphere);
  const rng = makeRng(stage.seed ^ 0x5f3759df);

  // The rifle was zeroed on some other, standard day. Today is not that day.
  const zeroEnv: Environment = {
    atmosphere: ICAO,
    wind: { speed: 0, fromAngle: 0 },
    latitude: 0,
    azimuth: 0,
  };
  const zero = zeroAngle(loadout.projectile, zeroEnv, loadout.zeroRangeM, loadout.rifle.sightHeightM);

  // Known-distance Free Field plates (and any marked targets) start disclosed.
  const known: Record<string, number> = {};
  for (const target of stage.targets) {
    if (target.disclosedRange) known[target.id] = target.rangeM;
  }

  return {
    stage,
    loadout,
    conditions,
    dope: buildDope(loadout, ICAO),
    zero,
    scope: initialScope(loadout),
    barrel: freshBarrel(),
    coldBore: coldBoreOffset(loadout, makeRng(stage.seed ^ 0xc0ffee)),
    rng,
    phase: 'prep',
    clockS: 0,
    roundsLeft: stage.rounds,
    targets: stage.targets.map((target) => ({
      target,
      availableAtS: target.appearsAtS ?? 0,
      goneAtS:
        target.appearsAtS !== undefined && target.exposureS !== undefined
          ? target.appearsAtS + target.exposureS
          : Infinity,
      hit: false,
      quality: 0,
      roundsSent: 0,
      hitAtS: 0,
      firstRound: false,
    })),
    shots: [],
    known,
    practice: timeless,
    freeField: isFree,
  };
}

export const isExposed = (runtime: TargetRuntime, clockS: number) =>
  clockS >= runtime.availableAtS && clockS < runtime.goneAtS;

/** Targets you could put a round into right now. */
export const exposedTargets = (session: Session) =>
  session.targets.filter((t) => isExposed(t, session.clockS));

/**
 * Which plate a shot is being sent at. Anything more than a few mils off every
 * target counts as a round into the dirt — you cannot claim you were shooting
 * at something you were nowhere near.
 */
export function targetUnderAim(
  session: Session,
  aimAz: number,
  aimEl: number,
): TargetRuntime | null {
  let best: TargetRuntime | null = null;
  let bestErr = Infinity;
  for (const runtime of session.targets) {
    if (!isExposed(runtime, session.clockS)) continue;
    const t = runtime.target;
    const lateral = targetOffsetAt(t, session.clockS);
    const az = t.azimuth + lateral / Math.max(1, t.rangeM);
    const el = targetInclination(t, session.stage.firingHeightM);
    const dAz = aimAz - az;
    const dEl = aimEl - el;
    const err = Math.hypot(dAz, dEl);
    const radius = Math.max(t.widthM, t.tallM) / 2 / Math.max(1, t.rangeM);
    const tolerance = Math.max(0.006, radius * 3.5);
    if (err < tolerance && err < bestErr) {
      best = runtime;
      bestErr = err;
    }
  }
  return best;
}

export interface FireOutcome {
  shot: ShotResult;
  runtime: TargetRuntime | null;
  newlyHit: boolean;
  outOfAmmo: boolean;
}

export function fireRound(
  session: Session,
  aimAz: number,
  aimEl: number,
  cant: number,
): FireOutcome | null {
  if (session.phase !== 'live' || session.roundsLeft <= 0) return null;

  const runtime = targetUnderAim(session, aimAz, aimEl);
  const wasFirstRound = runtime !== null && runtime.roundsSent === 0;

  const shot = resolveShot({
    loadout: session.loadout,
    conditions: session.conditions,
    scope: session.scope,
    zeroAngle: session.zero,
    aimAz,
    aimEl,
    cant,
    timeS: session.clockS,
    target: runtime ? runtime.target : null,
    firingHeightM: session.stage.firingHeightM,
    fallbackRangeM: session.stage.targets[0]?.rangeM ?? 600,
    barrel: session.barrel,
    coldBore: session.coldBore,
    rng: session.rng,
  });

  session.roundsLeft -= 1;
  session.barrel = {
    shotsFired: session.barrel.shotsFired + 1,
    heat: clamp(session.barrel.heat + 0.14, 0, 1),
  };
  session.shots.push({ shot, atS: session.clockS, targetId: runtime?.target.id ?? null });

  let newlyHit = false;
  if (runtime) {
    runtime.roundsSent += 1;
    if (shot.quality !== null && !runtime.hit) {
      runtime.hit = true;
      runtime.quality = shot.quality;
      runtime.hitAtS = session.clockS;
      runtime.firstRound = wasFirstRound;
      newlyHit = true;
    }
  }

  const allDown = session.targets.every((t) => t.hit);
  if (allDown || session.roundsLeft <= 0) {
    // One last beat so the final splash can be watched before the card comes up.
    session.phase = allDown ? 'complete' : session.phase;
  }

  return { shot, runtime, newlyHit, outOfAmmo: session.roundsLeft <= 0 };
}

/** Advance the stage clock. The barrel cools while nothing is happening. */
export function tick(session: Session, dt: number): void {
  if (session.phase !== 'live') return;
  session.clockS += dt;
  session.barrel = {
    shotsFired: session.barrel.shotsFired,
    heat: clamp(session.barrel.heat - dt * 0.035, 0, 1),
  };
  // Practice / Free Field are timeless: the clock still runs for wind and
  // movers, but it never ends the stage. Free Field's HUD counts the clock up.
  if (
    !session.practice &&
    Number.isFinite(session.stage.timeLimitS) &&
    session.clockS >= session.stage.timeLimitS
  ) {
    session.phase = 'complete';
  }
}

export function finishSession(session: Session): StageScore {
  const perTarget: TargetScore[] = session.targets.map((runtime) =>
    scoreTarget(
      runtime.target,
      runtime.hit,
      runtime.quality,
      runtime.firstRound,
      Math.max(0, runtime.hitAtS - runtime.availableAtS),
      session.stage.parPerTargetS,
      runtime.roundsSent,
      session.practice,
    ),
  );
  const radials = session.shots
    .filter((s) => s.targetId !== null)
    .map((s) => Math.hypot(s.shot.missRightMil, s.shot.missUpMil));
  const meanRadialMil = radials.length
    ? radials.reduce((a, b) => a + b, 0) / radials.length
    : 0;
  return scoreStage(
    session.stage,
    perTarget,
    session.shots.length,
    session.clockS,
    meanRadialMil,
  );
}

/**
 * The honest answer for a target: what the rifle would have to be told, in the
 * conditions as they are this instant. The ballistic solver in the player's
 * kit gets to see this. Everyone else gets a data card and their own judgement.
 */
export function trueSolution(session: Session, target: Target): FiringSolution {
  const env: Environment = {
    atmosphere: session.conditions.atmosphere,
    wind: effectiveWind(session.conditions, target.rangeM, session.clockS),
    latitude: session.conditions.latitude,
    azimuth: session.conditions.azimuth,
  };
  return solve(
    session.loadout.projectile,
    env,
    target.rangeM,
    session.loadout.rifle.sightHeightM,
    targetInclination(target, session.stage.firingHeightM),
  );
}

/** What the solver should be told to dial, relative to the zero, in mils. */
export function dialMils(session: Session, solution: FiringSolution): number {
  return radToMil(solution.elevation - session.zero);
}
