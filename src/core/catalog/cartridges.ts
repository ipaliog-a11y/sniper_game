import type { DragModel } from '../drag';

/**
 * Ammunition. The numbers here are the ones a reloader would read off a box:
 * bullet weight, length, the G7 form-factor coefficient and a reference muzzle
 * velocity out of a reference barrel. Everything the sim needs is derived from
 * these, so changing a load changes drop, drift, recoil and stability together
 * instead of one at a time.
 */

export type Chambering = '308win' | '65cm' | '300wm' | '338lm' | '50bmg';

export interface Cartridge {
  id: string;
  name: string;
  /** Short label for the ammo card. */
  grade: 'Match' | 'Hunting' | 'Subsonic' | 'Surplus' | 'AP';
  chambering: Chambering;
  /** Bullet mass, grains. */
  grains: number;
  /** Bullet diameter, inches. */
  diameterIn: number;
  /** Overall bullet length, inches. Drives gyroscopic stability. */
  lengthIn: number;
  dragModel: DragModel;
  /** BC in lb/in^2 against the drag model above. */
  bc: number;
  /** Muzzle velocity, fps, out of `referenceBarrelIn` at 15 C. */
  velocityFps: number;
  referenceBarrelIn: number;
  /**
   * Round-to-round velocity spread, fps standard deviation. This is the part
   * of a group you cannot dial out, and it is what separates match ammo from
   * everything else past 600 m.
   */
  velocitySd: number;
  /** Inherent dispersion the ammunition contributes, MOA at 1 sigma. */
  dispersionMoa: number;
  /** Sensitivity of muzzle velocity to powder temperature, fps per degree C. */
  tempSensitivity: number;
  cost: number;
  blurb: string;
}

export const CARTRIDGES: Cartridge[] = [
  // --- .308 Winchester ---
  {
    id: '308-m80',
    name: '7.62 M80 Ball',
    grade: 'Surplus',
    chambering: '308win',
    grains: 147,
    diameterIn: 0.308,
    lengthIn: 1.13,
    dragModel: 'G7',
    bc: 0.197,
    velocityFps: 2750,
    referenceBarrelIn: 24,
    velocitySd: 28,
    dispersionMoa: 0.9,
    tempSensitivity: 1.6,
    cost: 0,
    blurb: 'Crate ammunition. Cheap, inconsistent, and honest about it.',
  },
  {
    id: '308-168',
    name: '168 gr HPBT Match',
    grade: 'Match',
    chambering: '308win',
    grains: 168,
    diameterIn: 0.308,
    lengthIn: 1.215,
    dragModel: 'G7',
    bc: 0.218,
    velocityFps: 2650,
    referenceBarrelIn: 24,
    velocitySd: 12,
    dispersionMoa: 0.4,
    tempSensitivity: 1.1,
    cost: 400,
    blurb: 'The classic 300-yard load. Goes transonic before 800 m.',
  },
  {
    id: '308-175',
    name: '175 gr SMK Match',
    grade: 'Match',
    chambering: '308win',
    grains: 175,
    diameterIn: 0.308,
    lengthIn: 1.24,
    dragModel: 'G7',
    bc: 0.243,
    velocityFps: 2600,
    referenceBarrelIn: 24,
    velocitySd: 10,
    dispersionMoa: 0.35,
    tempSensitivity: 1.0,
    cost: 700,
    blurb: 'What .308 was waiting for. Holds supersonic to about 900 m.',
  },
  {
    id: '308-sub',
    name: '190 gr Subsonic',
    grade: 'Subsonic',
    chambering: '308win',
    grains: 190,
    diameterIn: 0.308,
    lengthIn: 1.35,
    dragModel: 'G7',
    bc: 0.28,
    velocityFps: 1030,
    referenceBarrelIn: 24,
    velocitySd: 14,
    dispersionMoa: 0.7,
    tempSensitivity: 0.5,
    cost: 600,
    blurb: 'Quiet, and drops like a thrown brick. Inside 200 m only.',
  },

  // --- 6.5 Creedmoor ---
  {
    id: '65-130',
    name: '130 gr AB Hunting',
    grade: 'Hunting',
    chambering: '65cm',
    grains: 130,
    diameterIn: 0.264,
    lengthIn: 1.32,
    dragModel: 'G7',
    bc: 0.275,
    velocityFps: 2875,
    referenceBarrelIn: 26,
    velocitySd: 18,
    dispersionMoa: 0.6,
    tempSensitivity: 1.3,
    cost: 350,
    blurb: 'Fast and flat inside 600 m. Loses the argument beyond it.',
  },
  {
    id: '65-140',
    name: '140 gr ELD Match',
    grade: 'Match',
    chambering: '65cm',
    grains: 140,
    diameterIn: 0.264,
    lengthIn: 1.42,
    dragModel: 'G7',
    bc: 0.315,
    velocityFps: 2710,
    referenceBarrelIn: 26,
    velocitySd: 9,
    dispersionMoa: 0.3,
    tempSensitivity: 0.8,
    cost: 900,
    blurb: 'The reason everybody stopped arguing about 6.5 Creedmoor.',
  },
  {
    id: '65-147',
    name: '147 gr ELD Match',
    grade: 'Match',
    chambering: '65cm',
    grains: 147,
    diameterIn: 0.264,
    lengthIn: 1.49,
    dragModel: 'G7',
    bc: 0.351,
    velocityFps: 2695,
    referenceBarrelIn: 26,
    velocitySd: 8,
    dispersionMoa: 0.28,
    tempSensitivity: 0.7,
    cost: 1200,
    blurb: 'Slower off the muzzle, still supersonic when the 140 is not.',
  },

  // --- .300 Winchester Magnum ---
  {
    id: '300-190',
    name: '190 gr Match',
    grade: 'Match',
    chambering: '300wm',
    grains: 190,
    diameterIn: 0.308,
    lengthIn: 1.4,
    dragModel: 'G7',
    bc: 0.268,
    velocityFps: 2950,
    referenceBarrelIn: 26,
    velocitySd: 14,
    dispersionMoa: 0.42,
    tempSensitivity: 1.5,
    cost: 1100,
    blurb: 'Flat to 800 m and it hits like a truck when it gets there.',
  },
  {
    id: '300-215',
    name: '215 gr Hybrid Match',
    grade: 'Match',
    chambering: '300wm',
    grains: 215,
    diameterIn: 0.308,
    lengthIn: 1.55,
    dragModel: 'G7',
    bc: 0.354,
    velocityFps: 2825,
    referenceBarrelIn: 26,
    velocitySd: 11,
    dispersionMoa: 0.33,
    tempSensitivity: 1.2,
    cost: 1600,
    blurb: 'Heavy for calibre, and it barely notices a 10 mph crosswind.',
  },

  // --- .338 Lapua Magnum ---
  {
    id: '338-250',
    name: '250 gr Scenar',
    grade: 'Match',
    chambering: '338lm',
    grains: 250,
    diameterIn: 0.338,
    lengthIn: 1.55,
    dragModel: 'G7',
    bc: 0.322,
    velocityFps: 3000,
    referenceBarrelIn: 27,
    velocitySd: 13,
    dispersionMoa: 0.4,
    tempSensitivity: 1.4,
    cost: 1800,
    blurb: 'The lighter .338 load. Very fast, very loud, very expensive.',
  },
  {
    id: '338-300',
    name: '300 gr SMK',
    grade: 'Match',
    chambering: '338lm',
    grains: 300,
    diameterIn: 0.338,
    lengthIn: 1.75,
    dragModel: 'G7',
    bc: 0.381,
    velocityFps: 2720,
    referenceBarrelIn: 27,
    velocitySd: 10,
    dispersionMoa: 0.3,
    tempSensitivity: 1.1,
    cost: 2400,
    blurb: 'Supersonic past 1500 m. This is what a mile shot is made of.',
  },

  // --- .50 BMG ---
  {
    id: '50-750',
    name: '750 gr A-MAX',
    grade: 'Match',
    chambering: '50bmg',
    grains: 750,
    diameterIn: 0.51,
    lengthIn: 2.34,
    dragModel: 'G7',
    bc: 0.53,
    velocityFps: 2820,
    referenceBarrelIn: 29,
    velocitySd: 16,
    dispersionMoa: 0.45,
    tempSensitivity: 1.7,
    cost: 3600,
    blurb: 'Carries supersonic beyond two kilometres. Ruins shoulders.',
  },
  {
    id: '50-ap',
    name: 'Mk 211 AP',
    grade: 'AP',
    chambering: '50bmg',
    grains: 671,
    diameterIn: 0.51,
    lengthIn: 2.28,
    dragModel: 'G7',
    bc: 0.42,
    velocityFps: 2910,
    referenceBarrelIn: 29,
    velocitySd: 26,
    dispersionMoa: 0.9,
    tempSensitivity: 1.9,
    cost: 2600,
    blurb: 'Made to punch engine blocks, not to win matches.',
  },
];

export const cartridgeById = (id: string): Cartridge | undefined =>
  CARTRIDGES.find((c) => c.id === id);

export const cartridgesFor = (chambering: Chambering): Cartridge[] =>
  CARTRIDGES.filter((c) => c.chambering === chambering);
