/**
 * Everything inside the simulation is SI: metres, metres per second, kilograms,
 * radians, degrees Celsius, Pascals. Imperial only exists at the edges, because
 * that is how shooters actually talk, and the conversions live here so no other
 * file has to hold a magic number.
 */

// --- angle -------------------------------------------------------------

/** One milliradian, in radians. A true mil, not the 6400-per-turn artillery mil. */
export const MIL = 0.001;

/** One minute of angle, in radians. 1/60 of a degree, so ~1.047" at 100 yd. */
export const MOA = Math.PI / (180 * 60);

export const radToMil = (rad: number) => rad / MIL;
export const milToRad = (mil: number) => mil * MIL;
export const radToMoa = (rad: number) => rad / MOA;
export const moaToRad = (moa: number) => moa * MOA;
export const degToRad = (deg: number) => (deg * Math.PI) / 180;
export const radToDeg = (rad: number) => (rad * 180) / Math.PI;

/** Wrap to (-pi, pi]. Used for bearings, where 359 deg and -1 deg are the same. */
export function wrapAngle(rad: number): number {
  let a = rad % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  if (a <= -Math.PI) a += Math.PI * 2;
  return a;
}

// --- length ------------------------------------------------------------

export const YARD = 0.9144;
export const FOOT = 0.3048;
export const INCH = 0.0254;

export const yardToM = (yd: number) => yd * YARD;
export const mToYard = (m: number) => m / YARD;
export const inchToM = (inch: number) => inch * INCH;
export const mToInch = (m: number) => m / INCH;
export const ftToM = (ft: number) => ft * FOOT;
export const mToFt = (m: number) => m / FOOT;

// --- mass --------------------------------------------------------------

/** A grain: 1/7000 of a pound. Bullets are weighed in these and nothing else. */
export const GRAIN = 0.00006479891;

export const grainToKg = (gr: number) => gr * GRAIN;
export const kgToGrain = (kg: number) => kg / GRAIN;

// --- speed -------------------------------------------------------------

export const fpsToMs = (fps: number) => fps * FOOT;
export const msToFps = (ms: number) => ms / FOOT;
export const mphToMs = (mph: number) => mph * 0.44704;
export const msToMph = (ms: number) => ms / 0.44704;

// --- temperature and pressure ------------------------------------------

export const fToC = (f: number) => ((f - 32) * 5) / 9;
export const cToF = (c: number) => (c * 9) / 5 + 32;
export const KELVIN = 273.15;

export const inHgToPa = (inHg: number) => inHg * 3386.389;
export const paToInHg = (pa: number) => pa / 3386.389;
export const hPaToPa = (hPa: number) => hPa * 100;
export const paToHPa = (pa: number) => pa / 100;

// --- ballistic coefficient ---------------------------------------------

/**
 * Ballistic coefficients are quoted in pounds per square inch, which is a mass
 * per unit area however odd that looks. Converting to kg/m^2 lets the drag
 * model stay in SI.
 */
export const BC_LB_PER_IN2_TO_KG_PER_M2 = 0.45359237 / (INCH * INCH);

export const bcToSi = (bc: number) => bc * BC_LB_PER_IN2_TO_KG_PER_M2;

// --- the mil relation --------------------------------------------------

/**
 * Range from apparent size. The whole reason a reticle has dots on it: a target
 * you know the height of, measured in mils, gives you the distance to it.
 *
 *   range (m) = size (m) / mils * 1000
 */
export function rangeFromMils(targetSizeM: number, mils: number): number {
  if (mils <= 0) return Infinity;
  return (targetSizeM / mils) * 1000;
}

/** The inverse: how many mils of reticle a target of a known size will cover. */
export function milsFromRange(targetSizeM: number, rangeM: number): number {
  if (rangeM <= 0) return Infinity;
  return (targetSizeM / rangeM) * 1000;
}

/** How wide, in metres, one mil is at a given distance. 1 mil = 10 cm at 100 m. */
export const milWidthAt = (rangeM: number) => rangeM * MIL;

// --- small helpers used all over ---------------------------------------

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number) => (b === a ? 0 : (v - a) / (b - a));
export const smoothstep = (t: number) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
