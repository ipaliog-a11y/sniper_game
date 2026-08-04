import { type Atmosphere, ICAO } from './atmosphere';
import { type Environment, solve, zeroAngle } from './ballistics';
import type { Optic } from './catalog/attachments';
import type { ResolvedLoadout } from './loadout';
import { MIL, MOA, clamp, degToRad, mphToMs, radToMil, radToMoa } from './units';

/**
 * The scope: what is dialled into the turrets, how far the turrets go, what
 * the reticle subtends, and the data card that tells you what to dial in the
 * first place.
 */

export interface ScopeState {
  /** Clicks up from the mechanical zero. Negative is down. */
  elevationClicks: number;
  /** Clicks right. Negative is left. */
  windageClicks: number;
  magnification: number;
  /** Parallax focus distance, metres. Off by enough and the reticle floats. */
  parallaxM: number;
}

export function initialScope(loadout: ResolvedLoadout): ScopeState {
  return {
    elevationClicks: 0,
    windageClicks: 0,
    magnification: loadout.optic.magMax * 0.6,
    parallaxM: loadout.selection.zeroRangeM,
  };
}

export const clicksToRad = (optic: Optic, clicks: number) => clicks * optic.clickRad;
export const radToClicks = (optic: Optic, rad: number) => rad / optic.clickRad;

export const maxElevationClicks = (optic: Optic) =>
  Math.round((optic.elevationTravelMils * MIL) / optic.clickRad);
export const maxWindageClicks = (optic: Optic) =>
  Math.round((optic.windageTravelMils * MIL) / optic.clickRad);

export function clampScope(optic: Optic, scope: ScopeState): ScopeState {
  const e = maxElevationClicks(optic);
  const w = maxWindageClicks(optic);
  return {
    ...scope,
    elevationClicks: Math.round(clamp(scope.elevationClicks, -e * 0.25, e)),
    windageClicks: Math.round(clamp(scope.windageClicks, -w, w)),
    magnification: clamp(scope.magnification, optic.magMin, optic.magMax),
  };
}

/** How a turret reads out loud. Mil turrets in tenths, MOA turrets in quarters. */
export function formatDial(optic: Optic, clicks: number): string {
  const rad = clicksToRad(optic, clicks);
  if (optic.turretUnit === 'MIL') return `${radToMil(rad).toFixed(1)} MIL`;
  return `${radToMoa(rad).toFixed(2)} MOA`;
}

export const dialUnitLabel = (optic: Optic) => (optic.turretUnit === 'MIL' ? 'MIL' : 'MOA');

/** Value of one click in the turret's own unit, for the +/- buttons. */
export const clickValue = (optic: Optic) =>
  optic.turretUnit === 'MIL' ? optic.clickRad / MIL : optic.clickRad / MOA;

// --- field of view ------------------------------------------------------

/** Field of view shrinks with magnification. Vertical FOV in radians. */
export function fieldOfView(optic: Optic, magnification: number): number {
  const mag = clamp(magnification, optic.magMin, optic.magMax);
  return degToRad(optic.fovDegAtMin) * (optic.magMin / mag);
}

/**
 * How many mils the reticle *appears* to subtend. A first focal plane reticle
 * grows with the image so a mil is always a mil; a second focal plane reticle
 * stays the same size on the glass, so at half its true magnification every
 * measurement you take off it is double what you think.
 */
export function reticleScale(optic: Optic, magnification: number): number {
  if (optic.ffp) return 1;
  return optic.trueAtMag / clamp(magnification, optic.magMin, optic.magMax);
}

// --- the data card ------------------------------------------------------

export interface DopeRow {
  rangeM: number;
  /** Elevation above the zero, mils. */
  elevationMil: number;
  /** Wind hold for a full-value 10 mph crosswind, mils. */
  wind10Mil: number;
  /** Gyroscopic drift at this distance, mils. */
  spinMil: number;
  tof: number;
  velocity: number;
  mach: number;
}

export interface Dope {
  rows: DopeRow[];
  atmosphere: Atmosphere;
  zeroRangeM: number;
  /** Where the bullet drops below Mach 1.2 and stops behaving. */
  transonicRangeM: number | null;
}

/** Printed card rows out to two miles; rows stop early if the bullet dies. */
const CARD_RANGES = [
  100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1750, 2000,
  2250, 2500, 2750, 3000, 3218, 3500, 3540, 3800,
];

/**
 * The card taped to the stock. Built for standard conditions and a pure
 * 10 mph crosswind, which is exactly why it is only ever a starting point:
 * on the day the air is a different density and the wind is not full value.
 */
export function buildDope(loadout: ResolvedLoadout, atmosphere: Atmosphere = ICAO): Dope {
  const env: Environment = {
    atmosphere,
    wind: { speed: 0, fromAngle: 0 },
    latitude: 0,
    azimuth: 0,
  };
  const windEnv: Environment = {
    atmosphere,
    wind: { speed: mphToMs(10), fromAngle: Math.PI / 2 },
    latitude: 0,
    azimuth: 0,
  };

  const sightHeight = loadout.rifle.sightHeightM;
  const zero = zeroAngle(loadout.projectile, env, loadout.zeroRangeM, sightHeight);

  const rows: DopeRow[] = [];
  let transonicRangeM: number | null = null;

  for (const rangeM of CARD_RANGES) {
    const dry = solve(loadout.projectile, env, rangeM, sightHeight);
    if (dry.impactSpeed < 30) break;
    const wet = solve(loadout.projectile, windEnv, rangeM, sightHeight);
    rows.push({
      rangeM,
      elevationMil: radToMil(dry.elevation - zero),
      // Positive means hold (or dial) into the wind, which for a wind off the
      // right means right. That is the correction, not the drift.
      wind10Mil: radToMil(wet.windage - dry.windage),
      spinMil: (dry.spinDrift / rangeM) * 1000,
      tof: dry.tof,
      velocity: dry.impactSpeed,
      mach: dry.impactMach,
    });
    if (transonicRangeM === null && dry.transonic) transonicRangeM = rangeM;
  }

  return { rows, atmosphere, zeroRangeM: loadout.zeroRangeM, transonicRangeM };
}

/** Read a value off the card between two printed lines, the way a shooter does. */
export function interpolateDope(dope: Dope, rangeM: number): DopeRow | null {
  const rows = dope.rows;
  if (rows.length === 0) return null;
  if (rangeM <= rows[0].rangeM) return rows[0];
  const last = rows[rows.length - 1];
  if (rangeM >= last.rangeM) return last;
  for (let i = 0; i < rows.length - 1; i++) {
    const a = rows[i];
    const b = rows[i + 1];
    if (rangeM <= b.rangeM) {
      const t = (rangeM - a.rangeM) / (b.rangeM - a.rangeM);
      return {
        rangeM,
        elevationMil: a.elevationMil + (b.elevationMil - a.elevationMil) * t,
        wind10Mil: a.wind10Mil + (b.wind10Mil - a.wind10Mil) * t,
        spinMil: a.spinMil + (b.spinMil - a.spinMil) * t,
        tof: a.tof + (b.tof - a.tof) * t,
        velocity: a.velocity + (b.velocity - a.velocity) * t,
        mach: a.mach + (b.mach - a.mach) * t,
      };
    }
  }
  return last;
}

// --- reticles -----------------------------------------------------------

export interface ReticleMark {
  /** Mils below the centre. Positive is down, the way holdovers are read. */
  down: number;
  /** Mils right of the vertical stadia. */
  right: number;
  size: number;
  label?: string;
}

/**
 * Reticle geometry in mils. A tree reticle carries wind holds on every
 * elevation line, which is what lets a shooter engage a second target at a
 * different distance without touching a turret.
 */
export function reticleMarks(optic: Optic): ReticleMark[] {
  const marks: ReticleMark[] = [];
  if (optic.reticle === 'duplex') return marks;

  if (optic.reticle === 'mildot') {
    for (let i = 1; i <= 5; i++) {
      marks.push({ down: i, right: 0, size: 0.11, label: i % 2 === 0 ? String(i) : undefined });
      marks.push({ down: -i, right: 0, size: 0.11 });
      marks.push({ down: 0, right: i, size: 0.11, label: i % 2 === 0 ? String(i) : undefined });
      marks.push({ down: 0, right: -i, size: 0.11 });
    }
    return marks;
  }

  // Christmas tree: a rung every half mil, widening wind holds as it drops.
  for (let i = 1; i <= 20; i++) {
    const down = i * 0.5;
    const whole = i % 2 === 0;
    marks.push({ down, right: 0, size: whole ? 0.16 : 0.09, label: whole ? String(down) : undefined });
    if (whole && down >= 2) {
      const holds = Math.min(6, Math.floor(down / 2) + 1);
      for (let h = 1; h <= holds; h++) {
        marks.push({ down, right: h * 0.5, size: 0.07 });
        marks.push({ down, right: -h * 0.5, size: 0.07 });
      }
    }
  }
  for (let i = 1; i <= 8; i++) {
    marks.push({ down: 0, right: i * 0.5, size: i % 2 === 0 ? 0.14 : 0.08 });
    marks.push({ down: 0, right: -i * 0.5, size: i % 2 === 0 ? 0.14 : 0.08 });
  }
  return marks;
}
