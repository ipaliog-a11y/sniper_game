import { KELVIN, inHgToPa, paToInHg } from './units';

/**
 * The air the bullet has to push through. Density is what actually matters —
 * temperature, pressure and humidity only appear in the sim because they move
 * density around — but shooters read them off a Kestrel individually, so the
 * model keeps them separate and derives density from all three.
 */
export interface Atmosphere {
  /** Ambient temperature at the firing point, degrees Celsius. */
  tempC: number;
  /** Station pressure (absolute, not sea-level corrected), Pascals. */
  pressurePa: number;
  /** Relative humidity, 0..1. */
  humidity: number;
  /** Height above sea level, metres. Only used to seed a plausible pressure. */
  altitudeM: number;
}

/** Sea level, 15 C, dry: the reference the drag tables are built against. */
export const STANDARD_DENSITY = 1.2250042;

export const ICAO: Atmosphere = {
  tempC: 15,
  pressurePa: 101325,
  humidity: 0,
  altitudeM: 0,
};

const R_DRY = 287.058; // J/(kg K)
const R_VAPOUR = 461.495; // J/(kg K)

/** Saturation vapour pressure over water, Tetens' approximation, in Pascals. */
export function saturationVapourPressure(tempC: number): number {
  return 610.78 * Math.exp((17.27 * tempC) / (tempC + 237.3));
}

/**
 * Air density. Humid air is *lighter* than dry air at the same pressure — water
 * vapour is lighter than the nitrogen it displaces — which surprises people who
 * expect a muggy day to be thick.
 */
export function airDensity(atm: Atmosphere): number {
  const t = atm.tempC + KELVIN;
  const pv = atm.humidity * saturationVapourPressure(atm.tempC);
  const pd = atm.pressurePa - pv;
  return pd / (R_DRY * t) + pv / (R_VAPOUR * t);
}

/** Ratio of this air to the standard atmosphere the drag curve assumes. */
export const densityRatio = (atm: Atmosphere) => airDensity(atm) / STANDARD_DENSITY;

/**
 * Speed of sound. Drag is a function of Mach number, so on a cold day the
 * bullet is at a higher Mach for the same muzzle velocity and drags harder —
 * on top of the cold air being denser.
 */
export function speedOfSound(atm: Atmosphere): number {
  return 331.3 * Math.sqrt(1 + atm.tempC / KELVIN);
}

/**
 * "Density altitude": the altitude in a standard atmosphere that would have
 * this density. A single number that folds temperature, pressure and humidity
 * together, which is why it is the one figure a shooter writes on a data card.
 */
export function densityAltitude(atm: Atmosphere): number {
  const ratio = densityRatio(atm);
  // Inverting the ISA density lapse, rho/rho0 = (1 - 2.25577e-5 h)^4.2559.
  return (1 - Math.pow(ratio, 1 / 4.2559)) / 2.25577e-5;
}

/** A plausible station pressure for a given altitude, ISA. */
export function standardPressureAt(altitudeM: number): number {
  return 101325 * Math.pow(1 - 2.25577e-5 * altitudeM, 5.25588);
}

export function describeAtmosphere(atm: Atmosphere): string {
  const da = Math.round(densityAltitude(atm));
  return `${atm.tempC.toFixed(0)}C ${paToInHg(atm.pressurePa).toFixed(2)}inHg ${(
    atm.humidity * 100
  ).toFixed(0)}%RH  DA ${da} m`;
}

export { inHgToPa };
