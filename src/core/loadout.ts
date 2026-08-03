import { type Atmosphere, ICAO } from './atmosphere';
import type { Projectile } from './ballistics';
import {
  type Gear,
  type GearId,
  type Muzzle,
  type Optic,
  type Support,
  GEAR,
  GEAR_SLOTS,
  MUZZLES,
  OPTICS,
  SUPPORTS,
  gearById,
  muzzleById,
  opticById,
  supportById,
} from './catalog/attachments';
import { type Cartridge, cartridgeById, cartridgesFor } from './catalog/cartridges';
import { type Rifle, rifleById } from './catalog/rifles';
import { MOA, bcToSi, cToF, clamp, fpsToMs, grainToKg, msToFps, paToInHg } from './units';

/**
 * A loadout is the four choices the player makes before a stage — rifle, ammo,
 * glass, and what hangs off the rest of the rifle — resolved down into the
 * handful of numbers the simulation and the hold model actually consume.
 */

export interface LoadoutSelection {
  rifleId: string;
  cartridgeId: string;
  opticId: string;
  muzzleId: string;
  supportId: string;
  gearIds: string[];
  /** Distance the rifle was zeroed at, metres. */
  zeroRangeM: number;
}

export interface ResolvedLoadout {
  selection: LoadoutSelection;
  rifle: Rifle;
  cartridge: Cartridge;
  optic: Optic;
  muzzle: Muzzle;
  support: Support;
  gear: Gear[];
  hasGear: (id: GearId) => boolean;

  projectile: Projectile;
  massKg: number;
  /** Rifle plus the metal bolted to it, kg. */
  systemMassKg: number;
  /** Muzzle velocity in the current conditions, m/s. */
  muzzleVelocity: number;
  /** Round to round velocity spread, m/s at 1 sigma. */
  velocitySd: number;
  /** Everything the shooter cannot correct for, MOA at 1 sigma. */
  dispersionMoa: number;
  /** Miller stability factor. Under 1.4 and the bullet is not going to sleep. */
  stability: number;
  /** Recoil impulse into the shoulder, newton-seconds. */
  recoilImpulse: number;
  /** How far the sight picture jumps and how long it takes to come back. */
  recoilKick: number;
  settleSeconds: number;
  cycleSeconds: number;

  /** Peak wander of the hold, mils. */
  swayMils: number;
  /** How quickly the hold wanders, roughly cycles per second. */
  swayRate: number;
  setupSeconds: number;
  zeroRangeM: number;
  totalCost: number;
}

export const DEFAULT_LOADOUT: LoadoutSelection = {
  rifleId: 'ranger24',
  cartridgeId: '308-m80',
  opticId: 'opt-duplex',
  muzzleId: 'muz-none',
  supportId: 'sup-none',
  gearIds: [],
  zeroRangeM: 100,
};

/**
 * Miller's stability rule. Long bullets need fast twist; the correction terms
 * for velocity and air density are what make a load that is stable in Arizona
 * in August come apart in Norway in February.
 */
export function millerStability(
  cartridge: Cartridge,
  twistIn: number,
  velocityFps: number,
  atm: Atmosphere,
): number {
  const d = cartridge.diameterIn;
  const l = cartridge.lengthIn / d; // bullet length in calibres
  const t = twistIn / d; // twist in calibres
  const base = (30 * cartridge.grains) / (t * t * Math.pow(d, 3) * l * (1 + l * l));
  const velocityTerm = Math.pow(velocityFps / 2800, 1 / 3);
  const airTerm = ((cToF(atm.tempC) + 460) / 519) * (29.92 / paToInHg(atm.pressurePa));
  return base * velocityTerm * airTerm;
}

/** Longer barrels burn more powder. Faster cartridges lose more per inch cut. */
const fpsPerInch = (cartridge: Cartridge) => cartridge.velocityFps / 110;

export function resolveLoadout(
  selection: LoadoutSelection,
  atmosphere: Atmosphere = ICAO,
): ResolvedLoadout {
  const rifle = rifleById(selection.rifleId) ?? rifleById(DEFAULT_LOADOUT.rifleId)!;
  const compatible = cartridgesFor(rifle.chambering);
  const cartridge =
    cartridgeById(selection.cartridgeId)?.chambering === rifle.chambering
      ? cartridgeById(selection.cartridgeId)!
      : compatible[0];
  const optic = opticById(selection.opticId) ?? OPTICS[0];
  const muzzle = muzzleById(selection.muzzleId) ?? MUZZLES[0];
  const support = supportById(selection.supportId) ?? SUPPORTS[0];
  const gear = selection.gearIds
    .slice(0, GEAR_SLOTS)
    .map((id) => gearById(id))
    .filter((g): g is Gear => Boolean(g));
  const gearSet = new Set(gear.map((g) => g.gear));

  // Velocity: barrel length off the reference, then the muzzle device, then
  // powder temperature. Cold powder is slow powder.
  const barrelDelta = (rifle.barrelIn - cartridge.referenceBarrelIn) * fpsPerInch(cartridge);
  const tempDelta = (atmosphere.tempC - 15) * cartridge.tempSensitivity;
  const velocityFps = cartridge.velocityFps + barrelDelta + muzzle.velocityDeltaFps + tempDelta;
  const muzzleVelocity = fpsToMs(velocityFps);

  const stability = millerStability(cartridge, rifle.twistIn, velocityFps, atmosphere);

  // A marginally stable bullet flies with its nose off the airflow and drags
  // more than its BC says it should.
  const stabilityPenalty = stability >= 1.5 ? 1 : clamp(0.86 + 0.14 * (stability / 1.5), 0.7, 1);

  const massKg = grainToKg(cartridge.grains);
  const systemMassKg = rifle.massKg + optic.massKg + muzzle.massKg + support.massKg;

  // Momentum out of the muzzle, with a rough allowance for the propellant gas
  // that leaves behind the bullet.
  const recoilImpulse = massKg * muzzleVelocity * 1.45 * muzzle.recoilFactor;
  const recoilVelocity = recoilImpulse / systemMassKg;
  const recoilKick = recoilVelocity;
  const settleSeconds = clamp(0.35 + recoilVelocity * 0.28, 0.35, 2.4);

  const baseDispersion = Math.hypot(rifle.precisionMoa, cartridge.dispersionMoa);
  const dispersionMoa = Math.max(0.05, baseDispersion + muzzle.dispersionMoa) /
    (stability >= 1.4 ? 1 : 0.75);

  // A heavier rifle sits still; the support does most of the rest.
  const swayMils =
    0.78 * Math.sqrt(6.5 / Math.max(3, systemMassKg)) * support.swayFactor;

  return {
    selection,
    rifle,
    cartridge,
    optic,
    muzzle,
    support,
    gear,
    hasGear: (id: GearId) => gearSet.has(id),
    projectile: {
      bcSi: bcToSi(cartridge.bc * stabilityPenalty),
      dragModel: cartridge.dragModel,
      muzzleVelocity,
      stability,
      rightHandTwist: rifle.rightHandTwist,
    },
    massKg,
    systemMassKg,
    muzzleVelocity,
    velocitySd: fpsToMs(cartridge.velocitySd),
    dispersionMoa,
    stability,
    recoilImpulse,
    recoilKick,
    settleSeconds,
    cycleSeconds: rifle.cycleSeconds,
    swayMils,
    swayRate: 0.85 * support.swaySpeed,
    setupSeconds: support.setupSeconds,
    zeroRangeM: selection.zeroRangeM,
    totalCost:
      rifle.cost +
      cartridge.cost +
      optic.cost +
      muzzle.cost +
      support.cost +
      gear.reduce((s, g) => s + g.cost, 0),
  };
}

/** Radius of the shooter-independent cone of fire at a distance, metres, 1 sigma. */
export const dispersionRadiusAt = (loadout: ResolvedLoadout, rangeM: number) =>
  loadout.dispersionMoa * MOA * rangeM;

export const muzzleVelocityFps = (loadout: ResolvedLoadout) => msToFps(loadout.muzzleVelocity);

export { GEAR, GEAR_SLOTS, MUZZLES, OPTICS, SUPPORTS };
