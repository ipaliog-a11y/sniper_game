import type { Chambering } from './cartridges';

/**
 * Rifles. A rifle is mostly four numbers that matter: how long the barrel is
 * (velocity), how fast it twists (stability), how much it weighs (recoil and
 * hold), and how long it takes to get the next round in the chamber.
 */

export interface Rifle {
  id: string;
  name: string;
  action: 'bolt' | 'semi';
  chambering: Chambering;
  /** Barrel length, inches. Off the cartridge's reference length, velocity moves. */
  barrelIn: number;
  /** Rifling twist, inches per turn. Lower is faster. */
  twistIn: number;
  /** Right-hand twist unless a gunsmith went out of their way. */
  rightHandTwist: boolean;
  /** Rifle mass with optic and bipod, kg. Heavy rifles hold still and kick less. */
  massKg: number;
  /** Inherent mechanical precision, MOA at 1 sigma, before the ammunition. */
  precisionMoa: number;
  /** Seconds to run the action and be back on target for the next shot. */
  cycleSeconds: number;
  /** Scope base cant, mils. Bought-in elevation so the turret has room to move. */
  railMils: number;
  /** Sight height over bore, metres. */
  sightHeightM: number;
  cost: number;
  blurb: string;
}

export const RIFLES: Rifle[] = [
  {
    id: 'ranger24',
    name: 'Ranger M24',
    action: 'bolt',
    chambering: '308win',
    barrelIn: 24,
    twistIn: 11.25,
    rightHandTwist: true,
    massKg: 6.4,
    precisionMoa: 0.35,
    cycleSeconds: 1.9,
    railMils: 5.8,
    sightHeightM: 0.045,
    cost: 0,
    blurb: 'A wooden-stocked school rifle. Nothing it does is exciting and nothing it does is wrong.',
  },
  {
    id: 'mk14',
    name: 'Mk14 Marksman',
    action: 'semi',
    chambering: '308win',
    barrelIn: 22,
    twistIn: 11.25,
    rightHandTwist: true,
    massKg: 5.6,
    precisionMoa: 0.65,
    cycleSeconds: 0.55,
    railMils: 5.8,
    sightHeightM: 0.06,
    cost: 2400,
    blurb: 'Gas gun. Half the precision of the bolt guns and four times the follow-up speed.',
  },
  {
    id: 'prs26',
    name: 'Sabre PRS',
    action: 'bolt',
    chambering: '65cm',
    barrelIn: 26,
    twistIn: 8,
    rightHandTwist: true,
    massKg: 7.9,
    precisionMoa: 0.22,
    cycleSeconds: 1.5,
    railMils: 8.7,
    sightHeightM: 0.055,
    cost: 4800,
    blurb: 'A chassis rifle built for competition. Heavy enough to sit still on its own.',
  },
  {
    id: 'aw300',
    name: 'Arctic AW300',
    action: 'bolt',
    chambering: '300wm',
    barrelIn: 26,
    twistIn: 10,
    rightHandTwist: true,
    massKg: 7.2,
    precisionMoa: 0.3,
    cycleSeconds: 2.1,
    railMils: 8.7,
    sightHeightM: 0.05,
    cost: 7600,
    blurb: 'Cold-weather magnum. Punishing to shoot fast, brutally flat when you do not.',
  },
  {
    id: 'lr338',
    name: 'Vanguard LR338',
    action: 'bolt',
    chambering: '338lm',
    barrelIn: 27,
    twistIn: 9.5,
    rightHandTwist: true,
    massKg: 9.1,
    precisionMoa: 0.28,
    cycleSeconds: 2.4,
    railMils: 11.6,
    sightHeightM: 0.06,
    cost: 12000,
    blurb: 'Where the mile shot starts. Twenty inches of rail and a muzzle blast you feel in your teeth.',
  },
  {
    id: 'am50',
    name: 'Hadron AM50',
    action: 'bolt',
    chambering: '50bmg',
    barrelIn: 29,
    twistIn: 15,
    rightHandTwist: true,
    massKg: 13.5,
    precisionMoa: 0.4,
    cycleSeconds: 3.4,
    railMils: 14.5,
    sightHeightM: 0.075,
    cost: 22000,
    blurb: 'Anti-materiel rifle. It does not care about the wind and the wind does not care about you.',
  },
];

export const rifleById = (id: string): Rifle | undefined => RIFLES.find((r) => r.id === id);
