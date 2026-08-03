import {
  type Environment,
  type Impact,
  type Projectile,
  type TrajectoryPoint,
  type Wind,
  fire,
} from './ballistics';
import type { ResolvedLoadout } from './loadout';
import { type Target, scoreImpact, targetInclination, targetOffsetAt } from './range';
import { type Rng, gaussian } from './rng';
import type { ScopeState } from './scope';
import { clicksToRad } from './scope';
import { MOA, clamp, radToMil } from './units';
import { type Conditions, effectiveWind } from './weather';

/**
 * Firing a round. Everything the shooter did — where the reticle actually was
 * when the trigger broke, what is on the turrets, how level the rifle is — plus
 * everything they had no say in: this round's muzzle velocity, the rifle's own
 * cone of fire, and a barrel that shoots differently cold than warm.
 */

export interface BarrelState {
  /** Rounds through the barrel this stage. */
  shotsFired: number;
  /** 0..1. Rises with rapid fire, falls while you wait. */
  heat: number;
}

export const freshBarrel = (): BarrelState => ({ shotsFired: 0, heat: 0 });

export interface ShotInput {
  loadout: ResolvedLoadout;
  conditions: Conditions;
  scope: ScopeState;
  /** Bore angle above the sight line at the zero range, radians. */
  zeroAngle: number;
  /** Where the optical axis was pointing at the break, radians. */
  aimAz: number;
  aimEl: number;
  /** Rifle roll, radians. */
  cant: number;
  /** Stage clock at the break, seconds. */
  timeS: number;
  /** The target being engaged, or null for a shot into the dirt. */
  target: Target | null;
  /** Height of the firing position above the range floor, metres. */
  firingHeightM: number;
  /** Range the shot is resolved against when there is no target. */
  fallbackRangeM?: number;
  barrel: BarrelState;
  /** This rifle's cold-bore throw, applied only to the first round of a stage. */
  coldBore: { up: number; right: number };
  rng: Rng;
}

export interface ShotResult {
  target: Target | null;
  /** Metres right of the target centre at the moment of arrival. */
  missRight: number;
  /** Metres above it. */
  missUp: number;
  /** The same miss in mils, which is what a spotter would call. */
  missRightMil: number;
  missUpMil: number;
  /** 0..1 for a hit, null for a miss. */
  quality: number | null;
  tof: number;
  impactSpeed: number;
  impactMach: number;
  energyJ: number;
  /** Effective wind over the flight, as it was at the break. */
  wind: Wind;
  /** This round's actual muzzle velocity, m/s. */
  muzzleVelocity: number;
  path: TrajectoryPoint[];
  /** True if the bullet had gone subsonic before it arrived. */
  transonic: boolean;
  /** True if it never made the distance at all. */
  short: boolean;
}

/**
 * A cold barrel does not shoot with the warm ones. The first round out of a
 * clean, cold bore lands somewhere slightly of its own choosing, and every
 * serious shooter records where. It is fixed per rifle, not random per shot,
 * so it can be learned — which is the whole point of the exercise.
 */
export function coldBoreOffset(loadout: ResolvedLoadout, rng: Rng): { up: number; right: number } {
  const spread = loadout.dispersionMoa * MOA * 1.6;
  return { up: gaussian(rng) * spread, right: gaussian(rng) * spread };
}

/** Barrel heat, integrated over the stage. Hot barrels string shots vertically. */
export function updateBarrel(barrel: BarrelState, dtSinceLastShot: number): BarrelState {
  return {
    shotsFired: barrel.shotsFired,
    heat: clamp(barrel.heat - dtSinceLastShot * 0.02, 0, 1),
  };
}

export function resolveShot(input: ShotInput): ShotResult {
  const { loadout, conditions, scope, target, rng, barrel } = input;
  const optic = loadout.optic;
  const rangeM = target ? target.rangeM : (input.fallbackRangeM ?? 600);

  const wind = effectiveWind(conditions, rangeM, input.timeS);
  const env: Environment = {
    atmosphere: conditions.atmosphere,
    wind,
    latitude: conditions.latitude,
    azimuth: conditions.azimuth,
  };

  // This round's velocity. Match ammunition is match ammunition because this
  // number is small.
  const velocityJitter = gaussian(rng) * loadout.velocitySd;
  const muzzleVelocity = loadout.muzzleVelocity + velocityJitter;
  const projectile: Projectile = { ...loadout.projectile, muzzleVelocity };

  const boreEl = input.zeroAngle + clicksToRad(optic, scope.elevationClicks);
  const boreAz = clicksToRad(optic, scope.windageClicks);

  const impact: Impact = fire(
    projectile,
    env,
    {
      aimAz: input.aimAz,
      aimEl: input.aimEl,
      boreEl,
      boreAz,
      cant: input.cant,
      sightHeight: loadout.rifle.sightHeightM,
    },
    rangeM,
    { dt: 0.0008, sampleEvery: 24, massKg: loadout.massKg, maxTof: 14 },
  );

  // Everything the shooter cannot see or correct: the rifle's own group, plus
  // a hot barrel walking the shots.
  const heatFactor = 1 + barrel.heat * 0.9;
  const coneRad = loadout.dispersionMoa * MOA * heatFactor;
  const jitterRight = gaussian(rng) * coneRad * rangeM;
  const jitterUp = gaussian(rng) * coneRad * rangeM * (1 + barrel.heat * 0.4);

  // The cold shot goes where the cold shot goes, once, at the start of the day.
  const cold = barrel.shotsFired === 0 ? 1 : 0;
  let missRight = impact.right + jitterRight + cold * input.coldBore.right * rangeM;
  let missUp = impact.up + jitterUp + cold * input.coldBore.up * rangeM;

  if (target) {
    // The target is where it is when the bullet gets there, not where it was
    // when the trigger broke. On a mover that difference is the whole shot.
    const arrival = input.timeS + impact.tof;
    const lateral = targetOffsetAt(target, arrival);
    const targetAz = target.azimuth + lateral / Math.max(1, target.rangeM);
    const targetEl = targetInclination(target, input.firingHeightM);
    missRight -= (targetAz - input.aimAz) * rangeM;
    missUp -= (targetEl - input.aimEl) * rangeM;
  }

  const quality = target ? scoreImpact(target, missRight, missUp) : null;

  return {
    target,
    missRight,
    missUp,
    missRightMil: radToMil(missRight / Math.max(1, rangeM)),
    missUpMil: radToMil(missUp / Math.max(1, rangeM)),
    quality,
    tof: impact.tof,
    impactSpeed: impact.speed,
    impactMach: impact.mach,
    energyJ: impact.energy,
    wind,
    muzzleVelocity,
    path: impact.path,
    transonic: impact.mach < 1.2,
    short: impact.short,
  };
}

/**
 * What a spotter would say out loud. Corrections are given as the hold that
 * would have fixed it, not as a description of where the bullet went, because
 * the shooter has to act on it.
 */
export function spotterCall(shot: ShotResult): string {
  if (!shot.target) return 'No call — nothing out there.';
  if (shot.short) return 'Short. It never got there.';
  if (shot.quality !== null) {
    if (shot.quality > 0.75) return 'Centre. Good hit.';
    if (shot.quality > 0.4) return 'Hit.';
    return 'Edge of the plate. It counted.';
  }
  const parts: string[] = [];
  const v = Math.abs(shot.missUpMil);
  const h = Math.abs(shot.missRightMil);
  if (v >= 0.05) parts.push(`${v.toFixed(1)} ${shot.missUp > 0 ? 'high' : 'low'}`);
  if (h >= 0.05) parts.push(`${h.toFixed(1)} ${shot.missRight > 0 ? 'right' : 'left'}`);
  if (parts.length === 0) return 'Splash on the edge. Send it again.';
  return `Miss — come ${parts.join(' and ')}.`;
}
