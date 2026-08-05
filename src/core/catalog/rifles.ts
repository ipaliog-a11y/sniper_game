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
    id: 'fieldman4',
    name: 'Fieldman No.4',
    action: 'bolt',
    chambering: '303brit',
    barrelIn: 25,
    twistIn: 10,
    rightHandTwist: true,
    massKg: 5.2,
    precisionMoa: 0.9,
    cycleSeconds: 2.0,
    railMils: 1.5,
    sightHeightM: 0.05,
    cost: 1000,
    blurb: 'A wartime glassed-up battle rifle. The bolt is slick; the groups are honest.',
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
    id: 'trailhand260',
    name: 'Trailhand 260',
    action: 'bolt',
    chambering: '260rem',
    barrelIn: 24,
    twistIn: 8,
    rightHandTwist: true,
    massKg: 5.1,
    precisionMoa: 0.35,
    cycleSeconds: 1.6,
    railMils: 5.8,
    sightHeightM: 0.048,
    cost: 3200,
    blurb: 'A hunting chassis with manners. It moves when you breathe and stays when you do not.',
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
    id: 'qmarc',
    name: 'Quartermaster ARC',
    action: 'semi',
    chambering: '6arc',
    barrelIn: 20,
    twistIn: 7.5,
    rightHandTwist: true,
    massKg: 6.1,
    precisionMoa: 0.55,
    cycleSeconds: 0.5,
    railMils: 5.8,
    sightHeightM: 0.062,
    cost: 5000,
    blurb: 'A gas gun that learned to group. Second shots are free; first shots still cost attention.',
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
    id: 'northlineprc',
    name: 'Northline PRC',
    action: 'bolt',
    chambering: '300prc',
    barrelIn: 26,
    twistIn: 8.5,
    rightHandTwist: true,
    massKg: 7.8,
    precisionMoa: 0.25,
    cycleSeconds: 1.8,
    railMils: 11.6,
    sightHeightM: 0.055,
    cost: 9800,
    blurb: 'A magnum built for the card, not the myth. Flat enough to trust; heavy enough to mean it.',
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
    id: 'sentineltrg',
    name: 'Sentinel TRG',
    action: 'bolt',
    chambering: '338lm',
    barrelIn: 27,
    twistIn: 10,
    rightHandTwist: true,
    massKg: 8.7,
    precisionMoa: 0.3,
    cycleSeconds: 2.2,
    railMils: 11.6,
    sightHeightM: 0.055,
    cost: 12500,
    blurb: 'Built for snow and long waits. The bolt runs quiet; the wind still does not.',
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
    // ~70 MOA canted rail — ELR anti-materiel standard so deep dope still dials.
    railMils: 20,
    sightHeightM: 0.075,
    cost: 22000,
    blurb:
      'Anti-materiel rifle with a deep canted rail. It does not care about the wind and the wind does not care about you.',
  },
];

export const rifleById = (id: string): Rifle | undefined => RIFLES.find((r) => r.id === id);
