import { type Atmosphere, densityAltitude, standardPressureAt } from './atmosphere';
import type { Wind } from './ballistics';
import { type Rng, gaussian, makeRng, range } from './rng';
import { clamp, degToRad, mphToMs, msToMph, radToDeg, wrapAngle } from './units';

/**
 * Weather. The bit of this game that is actually hard.
 *
 * Wind is not one number. It changes while you are behind the rifle, it is a
 * different thing at 300 m than it is at the muzzle, and the only way you know
 * any of it is by reading flags, grass and mirage. This module generates a
 * plausible, repeatable wind field and hands the shooter nothing but the cues.
 */

export type Sky = 'clear' | 'high-cloud' | 'overcast' | 'rain' | 'fog';

export interface WindZone {
  /** Distance downrange of the flag or indicator, metres. */
  distanceM: number;
  /** Steady speed at this zone, m/s. */
  baseSpeed: number;
  /** Steady direction the wind comes from, radians clockwise from downrange. */
  baseAngle: number;
  /** How much this zone swings about, 0..1. */
  volatility: number;
  /** Phase offset so the zones do not all breathe in time. */
  phase: number;
  /** What the shooter can actually see here. */
  indicator: 'flag' | 'grass' | 'dust' | 'mirage' | 'smoke';
}

export interface Conditions {
  seed: number;
  atmosphere: Atmosphere;
  /** Latitude, radians. Drives Coriolis. */
  latitude: number;
  /** Bearing the shooter faces, radians clockwise from true north. */
  azimuth: number;
  sky: Sky;
  /** 0..1. Fog, rain and low light all eat this. */
  visibility: number;
  /** 0..1. How hard the mirage is boiling, which is a wind gauge in itself. */
  mirage: number;
  /** Local time of day in hours, for the light. */
  hour: number;
  zones: WindZone[];
  /** Slope of the ground to the targets, radians. Positive is uphill. */
  inclination: number;
}

export interface WeatherPreset {
  id: string;
  name: string;
  blurb: string;
  tempC: [number, number];
  altitudeM: [number, number];
  humidity: [number, number];
  windMph: [number, number];
  volatility: [number, number];
  sky: Sky[];
  hour: [number, number];
}

export const PRESETS: WeatherPreset[] = [
  {
    id: 'calm',
    name: 'Still Morning',
    blurb: 'Barely a breath. Everything you miss is your own fault.',
    tempC: [8, 16],
    altitudeM: [40, 200],
    humidity: [0.5, 0.85],
    windMph: [0, 3],
    volatility: [0.05, 0.2],
    sky: ['clear', 'high-cloud'],
    hour: [6, 9],
  },
  {
    id: 'fair',
    name: 'Fair Breeze',
    blurb: 'A steady quartering wind. Read it once and it stays read.',
    tempC: [14, 24],
    altitudeM: [100, 600],
    humidity: [0.3, 0.6],
    windMph: [4, 10],
    volatility: [0.15, 0.35],
    sky: ['clear', 'high-cloud'],
    hour: [9, 15],
  },
  {
    id: 'desert',
    name: 'High Desert',
    blurb: 'Thin, hot air and a mirage you could swim in. The bullet flies flat and the picture lies.',
    tempC: [30, 42],
    altitudeM: [1200, 2200],
    humidity: [0.05, 0.2],
    windMph: [3, 12],
    volatility: [0.3, 0.6],
    sky: ['clear'],
    hour: [11, 16],
  },
  {
    id: 'switch',
    name: 'Switching Valley',
    blurb: 'The wind changes its mind every ten seconds and each flag disagrees.',
    tempC: [10, 20],
    altitudeM: [300, 900],
    humidity: [0.4, 0.75],
    windMph: [6, 16],
    volatility: [0.55, 0.95],
    sky: ['high-cloud', 'overcast'],
    hour: [10, 16],
  },
  {
    id: 'storm',
    name: 'Front Coming In',
    blurb: 'Heavy, wet air, failing light and a wind that will not sit still.',
    tempC: [2, 10],
    altitudeM: [20, 300],
    humidity: [0.8, 1],
    windMph: [10, 22],
    volatility: [0.4, 0.8],
    sky: ['overcast', 'rain'],
    hour: [15, 19],
  },
  {
    id: 'arctic',
    name: 'Cold Snap',
    blurb: 'Dense freezing air. Everything shoots low and the powder is asleep.',
    tempC: [-22, -6],
    altitudeM: [200, 800],
    humidity: [0.5, 0.8],
    windMph: [2, 9],
    volatility: [0.1, 0.4],
    sky: ['clear', 'overcast', 'fog'],
    hour: [8, 15],
  },
];

export const presetById = (id: string) => PRESETS.find((p) => p.id === id) ?? PRESETS[1];

const INDICATORS: WindZone['indicator'][] = ['flag', 'grass', 'dust', 'mirage', 'smoke'];

/**
 * Build a wind field. Zones downrange inherit the firing point's wind but drift
 * off it — terrain bends wind, and the further out you look the less the flag
 * at your elbow is telling you.
 */
export function generateConditions(
  preset: WeatherPreset,
  seed: number,
  maxRangeM: number,
): Conditions {
  const rng = makeRng(seed);

  const tempC = range(rng, preset.tempC[0], preset.tempC[1]);
  const altitudeM = range(rng, preset.altitudeM[0], preset.altitudeM[1]);
  const humidity = range(rng, preset.humidity[0], preset.humidity[1]);
  // Station pressure wanders a little either side of standard for the altitude.
  const pressurePa = standardPressureAt(altitudeM) * range(rng, 0.985, 1.015);

  const sky = preset.sky[Math.floor(rng() * preset.sky.length)];
  const hour = range(rng, preset.hour[0], preset.hour[1]);
  const baseSpeed = mphToMs(range(rng, preset.windMph[0], preset.windMph[1]));
  const baseAngle = rng() * Math.PI * 2;
  const volatility = range(rng, preset.volatility[0], preset.volatility[1]);

  const visibility = clamp(
    (sky === 'fog' ? 0.35 : sky === 'rain' ? 0.6 : sky === 'overcast' ? 0.85 : 1) *
      (hour < 7 || hour > 18 ? 0.7 : 1),
    0.2,
    1,
  );

  // Mirage needs sun and heat and dies in a strong wind.
  const sunny = sky === 'clear' ? 1 : sky === 'high-cloud' ? 0.6 : 0.15;
  const mirage = clamp(
    sunny * clamp((tempC - 5) / 30, 0, 1) * clamp(1 - msToMph(baseSpeed) / 18, 0.15, 1),
    0,
    1,
  );

  const zoneCount = clamp(Math.round(maxRangeM / 250), 2, 5);
  const zones: WindZone[] = [];
  for (let i = 0; i < zoneCount; i++) {
    const distanceM = i === 0 ? 25 : Math.round((maxRangeM * (i + 0.5)) / zoneCount);
    // Terrain steers the wind more the further downrange you look.
    const spread = volatility * (0.12 + 0.28 * (i / Math.max(1, zoneCount - 1)));
    zones.push({
      distanceM,
      baseSpeed: Math.max(0, baseSpeed * (1 + gaussian(rng) * spread * 0.6)),
      baseAngle: baseAngle + gaussian(rng) * spread,
      volatility: clamp(volatility * range(rng, 0.7, 1.3), 0, 1),
      phase: rng() * Math.PI * 2,
      indicator: i === 0 ? 'flag' : INDICATORS[Math.floor(rng() * INDICATORS.length)],
    });
  }

  return {
    seed,
    atmosphere: { tempC, pressurePa, humidity, altitudeM },
    latitude: degToRad(range(rng, -55, 60)),
    azimuth: rng() * Math.PI * 2,
    sky,
    visibility,
    mirage,
    hour,
    zones,
    inclination: degToRad(gaussian(rng) * 4),
  };
}

/**
 * What a zone is doing right now. Three sine components at unrelated periods
 * give a wind that lulls and gusts without ever quite repeating, which is what
 * makes waiting for a condition a real decision rather than a dice roll.
 */
export function zoneWindAt(zone: WindZone, t: number): Wind {
  const p = zone.phase;
  const swing =
    Math.sin(t * 0.37 + p) * 0.55 +
    Math.sin(t * 0.91 + p * 2.1) * 0.3 +
    Math.sin(t * 2.3 + p * 0.7) * 0.15;
  const speed = Math.max(0, zone.baseSpeed * (1 + swing * zone.volatility * 0.8));
  const angle =
    zone.baseAngle +
    (Math.sin(t * 0.29 + p * 1.7) * 0.6 + Math.sin(t * 1.13 + p) * 0.4) *
      zone.volatility *
      0.5;
  return { speed, fromAngle: angle };
}

/**
 * One wind vector for the flight, averaged over the zones the bullet passes.
 *
 * Weighted toward the muzzle: a bullet deflected early has the whole rest of
 * its flight to travel sideways off that heading, so the first third of the
 * range does most of the damage. Shooters call this wind weighting, and it is
 * why the flag next to you matters more than the one at the target.
 */
export function effectiveWind(conditions: Conditions, rangeM: number, t: number): Wind {
  let sumX = 0;
  let sumZ = 0;
  let sumW = 0;
  for (const zone of conditions.zones) {
    if (zone.distanceM > rangeM * 1.15) continue;
    const f = clamp(zone.distanceM / Math.max(1, rangeM), 0, 1);
    // Lag factor: deflection contributed by wind at fraction f of the range.
    const weight = Math.max(0.05, (1 - f) * (1 - f) + 0.15);
    const w = zoneWindAt(zone, t);
    sumX += Math.cos(w.fromAngle) * w.speed * weight;
    sumZ += Math.sin(w.fromAngle) * w.speed * weight;
    sumW += weight;
  }
  if (sumW === 0) return { speed: 0, fromAngle: 0 };
  const x = sumX / sumW;
  const z = sumZ / sumW;
  return { speed: Math.hypot(x, z), fromAngle: Math.atan2(z, x) };
}

/** The part of the wind that actually pushes the bullet sideways, m/s. */
export const crossComponent = (wind: Wind) => wind.speed * Math.sin(wind.fromAngle);
/** Positive is a headwind. Worth much less, but not nothing. */
export const headComponent = (wind: Wind) => wind.speed * Math.cos(wind.fromAngle);

/** Clock face, the way wind calls are given out loud. 3 o'clock is from the right. */
export function clockFace(fromAngle: number): number {
  const a = fromAngle < 0 ? fromAngle + Math.PI * 2 : fromAngle % (Math.PI * 2);
  const hour = Math.round((a / (Math.PI * 2)) * 12);
  return hour === 0 ? 12 : hour;
}

/** Full/half/third value, the field shorthand for how much of a wind counts. */
export function windValue(fromAngle: number): string {
  const cross = Math.abs(Math.sin(fromAngle));
  if (cross > 0.93) return 'full value';
  if (cross > 0.6) return 'three quarter';
  if (cross > 0.35) return 'half value';
  if (cross > 0.12) return 'quarter value';
  return 'no value';
}

/**
 * What the shooter's own instruments say, as opposed to what is true. Without a
 * weather meter you get a rounded-off guess, and the error is stable for the
 * stage so you cannot re-read your way out of it.
 */
export function estimateConditions(conditions: Conditions, precise: boolean): {
  tempC: number;
  pressurePa: number;
  humidity: number;
  altitudeM: number;
  densityAltitudeM: number;
} {
  const atm = conditions.atmosphere;
  if (precise) {
    return {
      tempC: atm.tempC,
      pressurePa: atm.pressurePa,
      humidity: atm.humidity,
      altitudeM: atm.altitudeM,
      densityAltitudeM: densityAltitude(atm),
    };
  }
  const rng = makeRng(conditions.seed ^ 0x9e3779b9);
  const guess: Atmosphere = {
    tempC: Math.round(atm.tempC + gaussian(rng) * 3),
    pressurePa: standardPressureAt(Math.round(atm.altitudeM / 100) * 100),
    humidity: clamp(Math.round((atm.humidity + gaussian(rng) * 0.15) * 10) / 10, 0, 1),
    altitudeM: Math.round(atm.altitudeM / 100) * 100,
  };
  return { ...guess, densityAltitudeM: densityAltitude(guess) };
}

export function describeWind(wind: Wind): string {
  return `${msToMph(wind.speed).toFixed(0)} mph from ${clockFace(wind.fromAngle)} o'clock, ${windValue(
    wind.fromAngle,
  )}`;
}

export { degToRad, radToDeg, wrapAngle };
