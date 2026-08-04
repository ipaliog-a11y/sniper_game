import { MIL, MOA } from '../units';

/**
 * Everything that bolts onto the rifle. Four slots: glass, muzzle, support and
 * three pockets of gear. The gear is deliberately the interesting decision —
 * a rangefinder, a weather meter and a solver between them do all of your
 * thinking for you, and you cannot carry all of them at once.
 */

export type Slot = 'optic' | 'muzzle' | 'support' | 'gear';

export interface AttachmentBase {
  id: string;
  name: string;
  slot: Slot;
  massKg: number;
  cost: number;
  blurb: string;
}

export type TurretUnit = 'MIL' | 'MOA';
export type Reticle = 'duplex' | 'mildot' | 'tree';

export interface Optic extends AttachmentBase {
  slot: 'optic';
  magMin: number;
  magMax: number;
  turretUnit: TurretUnit;
  /** Angular value of one turret click, radians. */
  clickRad: number;
  /** Usable elevation travel above zero, mils. */
  elevationTravelMils: number;
  windageTravelMils: number;
  reticle: Reticle;
  /**
   * First focal plane reticles subtend the same mils at every magnification.
   * Second focal plane ones are only honest at one setting, and misreading
   * that is a classic way to range a target 40% wrong.
   */
  ffp: boolean;
  /** For SFP glass, the magnification the reticle is true at. */
  trueAtMag: number;
  /** Field of view in degrees at minimum magnification. */
  fovDegAtMin: number;
  /** 0..1. Better glass means less haze and a readable mirage. */
  glass: number;
}

export interface Muzzle extends AttachmentBase {
  slot: 'muzzle';
  /** Multiplier on felt recoil. Lower settles the reticle faster after a shot. */
  recoilFactor: number;
  /** Change in muzzle velocity, fps. */
  velocityDeltaFps: number;
  /** Extra dispersion this device costs, MOA at 1 sigma. */
  dispersionMoa: number;
  /** 0..1. How much dust and flash the shot throws, which is how you get spotted. */
  signature: number;
  /** 0..1. 1 is a bare muzzle at full report. */
  loudness: number;
}

export interface Support extends AttachmentBase {
  slot: 'support';
  /** Multiplier on the wobble of the hold. This is the biggest single lever. */
  swayFactor: number;
  /** Multiplier on how fast the reticle drifts, separate from how far. */
  swaySpeed: number;
  /** Seconds to get settled behind the rifle at the start of a stage. */
  setupSeconds: number;
}

export type GearId =
  | 'lrf'
  | 'kestrel'
  | 'solver'
  | 'level'
  | 'spotter'
  | 'chrono'
  | 'traj';

export interface Gear extends AttachmentBase {
  slot: 'gear';
  gear: GearId;
}

export type Attachment = Optic | Muzzle | Support | Gear;

const MIL_CLICK = 0.1 * MIL;
const MOA_CLICK = 0.25 * MOA;

export const OPTICS: Optic[] = [
  {
    id: 'opt-duplex',
    name: 'Hunter 3-9x40',
    slot: 'optic',
    magMin: 3,
    magMax: 9,
    turretUnit: 'MOA',
    clickRad: MOA_CLICK,
    elevationTravelMils: 8,
    windageTravelMils: 6,
    reticle: 'duplex',
    ffp: false,
    trueAtMag: 9,
    fovDegAtMin: 7.2,
    glass: 0.45,
    massKg: 0.42,
    cost: 0,
    blurb: 'A deer scope with capped turrets and a plain cross. Ranging with it is guesswork.',
  },
  {
    id: 'opt-mildot',
    name: 'Vector 4-16x50 FFP',
    slot: 'optic',
    magMin: 4,
    magMax: 16,
    turretUnit: 'MIL',
    clickRad: MIL_CLICK,
    elevationTravelMils: 14,
    windageTravelMils: 8,
    reticle: 'mildot',
    ffp: true,
    trueAtMag: 16,
    fovDegAtMin: 5.6,
    glass: 0.65,
    massKg: 0.72,
    cost: 2200,
    blurb: 'Front focal plane mil-dot. The reticle means the same thing at every magnification.',
  },
  {
    id: 'opt-sfp',
    name: 'Meridian 6-24x50 SFP',
    slot: 'optic',
    magMin: 6,
    magMax: 24,
    turretUnit: 'MOA',
    clickRad: MOA_CLICK,
    elevationTravelMils: 17,
    windageTravelMils: 9,
    reticle: 'mildot',
    ffp: false,
    trueAtMag: 24,
    fovDegAtMin: 4.1,
    glass: 0.72,
    massKg: 0.83,
    cost: 3400,
    blurb: 'Bright, cheap for the magnification, and the reticle only tells the truth at 24x.',
  },
  {
    id: 'opt-tree',
    name: 'Ardent 5-25x56 FFP',
    slot: 'optic',
    magMin: 5,
    magMax: 25,
    turretUnit: 'MIL',
    clickRad: MIL_CLICK,
    elevationTravelMils: 26,
    windageTravelMils: 12,
    reticle: 'tree',
    ffp: true,
    trueAtMag: 25,
    fovDegAtMin: 4.4,
    glass: 0.9,
    massKg: 1.05,
    cost: 8900,
    blurb: 'Christmas-tree reticle and 26 mils of travel. Hold your correction and never touch a turret.',
  },
  {
    id: 'opt-elite',
    name: 'Ardent 7-35x56 FFP',
    slot: 'optic',
    magMin: 7,
    magMax: 35,
    turretUnit: 'MIL',
    clickRad: MIL_CLICK,
    elevationTravelMils: 32,
    windageTravelMils: 14,
    reticle: 'tree',
    ffp: true,
    trueAtMag: 35,
    fovDegAtMin: 3.2,
    glass: 1.0,
    massKg: 1.24,
    cost: 16000,
    blurb: 'Thirty-five power. At that magnification the mirage becomes a wind gauge.',
  },
  {
    id: 'opt-horizon',
    name: 'Horizon 8-80x56 FFP',
    slot: 'optic',
    magMin: 8,
    magMax: 80,
    turretUnit: 'MIL',
    clickRad: MIL_CLICK,
    elevationTravelMils: 48,
    windageTravelMils: 18,
    reticle: 'tree',
    ffp: true,
    trueAtMag: 80,
    fovDegAtMin: 2.6,
    glass: 1.0,
    massKg: 1.55,
    cost: 28000,
    blurb:
      'Competition ELR glass: eighty power and 48 mils of elevation. Find the plate at 12×, then zoom until the mirage is a wind gauge at two miles.',
  },
];

export const MUZZLES: Muzzle[] = [
  {
    id: 'muz-none',
    name: 'Bare Muzzle',
    slot: 'muzzle',
    recoilFactor: 1,
    velocityDeltaFps: 0,
    dispersionMoa: 0,
    signature: 0.7,
    loudness: 1,
    massKg: 0,
    cost: 0,
    blurb: 'Threads and a protector. Nothing between you and the blast.',
  },
  {
    id: 'muz-brake',
    name: 'Terminator Brake',
    slot: 'muzzle',
    recoilFactor: 0.55,
    velocityDeltaFps: 0,
    dispersionMoa: 0.05,
    signature: 1,
    loudness: 1.3,
    massKg: 0.18,
    cost: 900,
    blurb: 'Cuts recoil almost in half and throws a dust cloud that tells everyone where you are.',
  },
  {
    id: 'muz-can',
    name: 'Hushmark Suppressor',
    slot: 'muzzle',
    recoilFactor: 0.7,
    velocityDeltaFps: 35,
    dispersionMoa: 0.03,
    signature: 0.15,
    loudness: 0.35,
    massKg: 0.62,
    cost: 3200,
    blurb: 'Quiet, no dust signature, a little extra velocity, and a lot of extra weight on the barrel.',
  },
  {
    id: 'muz-tuner',
    name: 'Harmonic Tuner',
    slot: 'muzzle',
    recoilFactor: 0.95,
    velocityDeltaFps: -10,
    dispersionMoa: -0.08,
    signature: 0.6,
    loudness: 1,
    massKg: 0.14,
    cost: 1500,
    blurb: 'A weight on the muzzle that quiets the barrel whip. Pure precision, nothing else.',
  },
];

export const SUPPORTS: Support[] = [
  {
    id: 'sup-none',
    name: 'Unsupported',
    slot: 'support',
    swayFactor: 1,
    swaySpeed: 1,
    setupSeconds: 0,
    massKg: 0,
    cost: 0,
    blurb: 'Elbows and hope.',
  },
  {
    id: 'sup-bag',
    name: 'Rear Squeeze Bag',
    slot: 'support',
    swayFactor: 0.72,
    swaySpeed: 0.9,
    setupSeconds: 0.4,
    massKg: 0.3,
    cost: 250,
    blurb: 'Takes the vertical out of the hold for the price of a sandwich.',
  },
  {
    id: 'sup-bipod',
    name: 'Recon Bipod',
    slot: 'support',
    swayFactor: 0.5,
    swaySpeed: 0.75,
    setupSeconds: 1.2,
    massKg: 0.55,
    cost: 700,
    blurb: 'Loaded properly it kills most of the wobble and all of your mobility.',
  },
  {
    id: 'sup-tripod',
    name: 'Ballhead Tripod',
    slot: 'support',
    swayFactor: 0.3,
    swaySpeed: 0.55,
    setupSeconds: 3.5,
    massKg: 1.9,
    cost: 2600,
    blurb: 'The steadiest thing you can shoot off. It takes an age to level.',
  },
];

export const GEAR: Gear[] = [
  {
    id: 'gear-lrf',
    name: 'Laser Rangefinder',
    slot: 'gear',
    gear: 'lrf',
    massKg: 0.3,
    cost: 2800,
    blurb: 'Gives you the range to the metre. Without it you range off the reticle and your own arithmetic.',
  },
  {
    id: 'gear-kestrel',
    name: 'Weather Meter',
    slot: 'gear',
    gear: 'kestrel',
    massKg: 0.12,
    cost: 2100,
    blurb:
      'Reads temperature, pressure, humidity, wind at the firing point, and station latitude — the latitude the ballistic solver needs for Coriolis.',
  },
  {
    id: 'gear-solver',
    name: 'Ballistic Solver',
    slot: 'gear',
    gear: 'solver',
    massKg: 0.15,
    cost: 3600,
    blurb:
      'Full firing solution including wind, spin drift and Coriolis from latitude and shooting azimuth. Without a weather meter the air and lat are estimates.',
  },
  {
    id: 'gear-level',
    name: 'Anti-Cant Level',
    slot: 'gear',
    gear: 'level',
    massKg: 0.05,
    cost: 400,
    blurb: 'A bubble in the bottom of the scope picture. Without it you cannot see that you are rolled over.',
  },
  {
    id: 'gear-spotter',
    name: 'Spotting Scope',
    slot: 'gear',
    gear: 'spotter',
    massKg: 1.4,
    cost: 1800,
    blurb: 'Shows the splash of a miss clearly enough to correct off it instead of guessing.',
  },
  {
    id: 'gear-chrono',
    name: 'Muzzle Chronograph',
    slot: 'gear',
    gear: 'chrono',
    massKg: 0.22,
    cost: 1400,
    blurb: 'Tells you what the barrel is really doing today, instead of what the box claimed.',
  },
  {
    id: 'gear-traj',
    name: 'Trajectory Plotter',
    slot: 'gear',
    gear: 'traj',
    massKg: 0.18,
    cost: 2200,
    blurb:
      'Side-view path of the round just fired. Tap the curve for range, height and speed at that point.',
  },
];

export const ATTACHMENTS: Attachment[] = [...OPTICS, ...MUZZLES, ...SUPPORTS, ...GEAR];

export const GEAR_SLOTS = 3;

export const attachmentById = (id: string): Attachment | undefined =>
  ATTACHMENTS.find((a) => a.id === id);

export const opticById = (id: string): Optic | undefined => OPTICS.find((o) => o.id === id);
export const muzzleById = (id: string): Muzzle | undefined => MUZZLES.find((m) => m.id === id);
export const supportById = (id: string): Support | undefined => SUPPORTS.find((s) => s.id === id);
export const gearById = (id: string): Gear | undefined => GEAR.find((g) => g.id === id);
