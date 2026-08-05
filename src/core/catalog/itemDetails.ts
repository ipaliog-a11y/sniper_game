/**
 * Extended catalogue copy for the armoury detail window.
 * English strings live here as fallbacks; locales may override via
 * catalog.{id}.detail and catalog.{id}.note.N.
 */

export type DetailKind = 'rifle' | 'optic' | 'muzzle';

export interface ItemDetail {
  kind: DetailKind;
  /** One-line role label under the name (e.g. "Bolt-action training rifle"). */
  role: string;
  /** Long-form description shown in the detail window. */
  detail: string;
  /** Short field notes / tips, separate from the card stats. */
  notes: string[];
  /**
   * Optional image path under public/ (e.g. "gear/ranger24.jpg").
   * When unset the UI draws a placeholder.
   */
  image?: string;
}

/** Detail kinds that get a View details button in the armoury. */
export const DETAIL_TABS = new Set(['rifle', 'optic', 'muzzle']);

export const ITEM_DETAILS: Record<string, ItemDetail> = {
  // --- rifles ---
  ranger24: {
    kind: 'rifle',
    role: 'Bolt-action training rifle · .308 Winchester',
    image: 'gear/ranger24.jpg',
    detail:
      'The Ranger M24 is the school rifle: a wooden stock, a 24-inch hammer-forged barrel, and a 1:11.25 twist that stabilises every common .308 match bullet without drama. Nothing about it is exotic. The action cycles cleanly, the free-float tube does not walk, and the 5.8 mil rail leaves enough elevation for a full-value 800 m hold with match ammo. It is heavy enough to sit still on a bag and light enough that a long day behind it does not leave your shoulder numb. If you are learning wind, zero, and trigger work, this is the tool that will not lie to you about your mistakes.',
    notes: [
      'Best paired with 168–175 gr match loads; the slow twist still holds them true past 700 m.',
      'Long cycle time rewards deliberate follow-through — rush the bolt and you pay for it on the next plate.',
      'Starter kit: free, honest, and already zeroed-friendly for the early course stages.',
    ],
  },
  fieldman4: {
    kind: 'rifle',
    role: 'Classic wartime bolt · .303 British',
    image: 'gear/fieldman4.jpg',
    detail:
      'The Fieldman No.4 is a glassed-up battle rifle from an earlier war: wood furniture, a slick bolt, and a 25-inch barrel in .303 British. It is lighter and cheaper than the modern rack, and its mechanical cone is honest rather than competitive — about 0.9 MOA before the ammunition. The rail is shallow because the era did not buy mils of elevation; you hold more and dial less past a few hundred metres. It teaches wind and hold-off without magnum recoil, and it will not paper over a bad call with flat modern ballistics.',
    notes: [
      'Surplus .303 is wide; match 180 gr loads tighten the cone if you can afford them.',
      'Low rail (~1.5 mil) — expect holds rather than deep turret runs on long plates.',
      'Light mass (~5.2 kg) means more sway unless you settle the bipod carefully.',
    ],
  },
  mk14: {
    kind: 'rifle',
    role: 'Semi-automatic marksman · .308 Winchester',
    image: 'gear/mk14.jpg',
    detail:
      'The Mk14 Marksman is a gas-operated battle rifle cut down to a DMR role. A 22-inch barrel and a working gas system shave precision compared with a bolt gun — groups open to about 0.65 MOA mechanical — but the cycle is under a second. That is the trade: you give away half a minute of angle on a cold plate and get it back when the stage wants two hits before the clock runs out. The taller sight line and lighter mass mean more muzzle rise and more hold work. Treat it as a follow-up machine, not a one-hole target rifle.',
    notes: [
      'Semi cycle (~0.55 s) dominates stages with multiple plates at similar range.',
      'Expect more dispersion than bolt guns; do not blame the wind for a loose group.',
      'Same .308 chambering as the Ranger — ammo is interchangeable once owned.',
    ],
  },
  trailhand260: {
    kind: 'rifle',
    role: 'Light mountain bolt · .260 Remington',
    image: 'gear/trailhand260.jpg',
    detail:
      'The Trailhand 260 is a light precision bolt for stalking ground and long walks to the firing point. Chambered in .260 Remington with a 24-inch 1:8 barrel, it throws 6.5-class bullets with mild recoil and a short-action cycle. Mass sits around five kilograms — kinder to carry than a PRS chassis, less forgiving when your pulse is high. It rewards bipod and bag work: get the set-up right and it groups like a school rifle; rush the hold and the reticle walks. A bridge between the free Ranger and the heavy Sabre.',
    notes: [
      'Pairs with 130–140 gr .260 loads; same bullet family as 6.5, different case.',
      'Light mass amplifies breath and pulse — bipod set-up time is not optional.',
      'Faster cycle (~1.6 s) than magnums without giving up bolt precision.',
    ],
  },
  prs26: {
    kind: 'rifle',
    role: 'Chassis competition bolt gun · 6.5 Creedmoor',
    image: 'gear/prs26.jpg',
    detail:
      'The Sabre PRS is built for precision rifle series stages: a rigid chassis, a 26-inch barrel with an 8-inch twist, and enough mass that the reticle barely notices your pulse. Chambered in 6.5 Creedmoor, it launches high-BC match bullets with a flat path and gentle recoil for the velocity. The 8.7 mil rail buys elevation for the long end of a PRS card without running out of turret. It is the first rifle in the rack that feels like it was designed around a data card rather than a deer stand.',
    notes: [
      'Fast 1:8 twist is ideal for 140–147 gr ELD-class bullets.',
      'Heavy chassis (~7.9 kg) cuts hold wobble; setup still matters on unsupported shots.',
      'Precision around 0.22 MOA mechanical — the ammo is usually the wider cone.',
    ],
  },
  qmarc: {
    kind: 'rifle',
    role: 'Modern gas DMR · 6mm ARC',
    image: 'gear/qmarc.jpg',
    detail:
      'The Quartermaster ARC is a gas-operated DMR that learned modern ballistics. A 20-inch barrel and 1:7.5 twist push high-BC 6mm bullets with less wind drift than the Mk14’s .308, while the semi cycle stays near half a second. Mechanical precision is still behind a bolt gun — around half a MOA — but the second plate on a timed string is where it earns its keep. Milder recoil than .308 gas guns keeps the reticle closer to the next hold. Fit glass with a real reticle; the ARC is wasted behind a hunting duplex.',
    notes: [
      'Semi cycle (~0.5 s) for multi-plate speed without Mk14-level .308 wind.',
      '6mm ARC match loads are flat and soft; surplus or hunting loads open the group.',
      'Same role as Mk14, different chambering — not ammo-compatible with .308.',
    ],
  },
  aw300: {
    kind: 'rifle',
    role: 'Cold-weather magnum bolt gun · .300 Winchester Magnum',
    image: 'gear/aw300.jpg',
    detail:
      'The Arctic AW300 is a magnum for hard weather and hard distances. .300 Winchester Magnum leaves the muzzle fast, stays flat through the middle distances, and still arrives with authority when .308 has gone soft. The price is recoil and a longer recovery: cycling takes over two seconds if you do it properly, and a rushed second shot will land high and right of where you wanted it. The cold-weather stock geometry and 26-inch barrel are honest tools for altitude and storm stages where density altitude changes the dope more than your ego wants to admit.',
    notes: [
      'Magnum recoil — brake or can recommended if you care about second-round hits.',
      'Pairs with 190–215 gr match loads for stretch past 1000 m.',
      'Slow cycle rewards one deliberate shot; multi-plate speed stages favour lighter chamberings.',
    ],
  },
  northlineprc: {
    kind: 'rifle',
    role: 'Modern magnum chassis · .300 PRC',
    image: 'gear/northlineprc.jpg',
    detail:
      'The Northline PRC is a magnum built around the data card rather than nostalgia. .300 Precision Rifle Cartridge feeds heavy .30 bullets efficiently: high BC, sensible powder, and a flatter path than classic .300 Winchester Magnum for the same class of projectile. A 26-inch 1:8.5 barrel and 11.6 mils of rail give room for true long-range work without jumping straight to .338 recoil. Cycle time is still deliberate; recovery is kinder than the Arctic AW300 if you brake it. Between the old magnum and the Lapua, this is the “new card” option.',
    notes: [
      '212–225 gr match loads are the point of the chambering — light pills waste it.',
      'Deep rail for long dope; pair with FFP glass that has the travel.',
      'Slightly quicker cycle than AW300; still not a speed-stage toy.',
    ],
  },
  lr338: {
    kind: 'rifle',
    role: 'Long-range bolt gun · .338 Lapua Magnum',
    image: 'gear/lr338.jpg',
    detail:
      'The Vanguard LR338 is where the mile shot stops being a rumour. A 27-inch barrel, 1:9.5 twist, and 11.6 mils of rail give a high-BC 300 gr class bullet room to stay supersonic deep into the next kilometre. Mass sits around nine kilograms; that steadies the hold and still leaves a muzzle blast you feel in your teeth. Turret travel and wind call matter more than trigger magic past 1200 m — this rifle does not forgive a wrong density or a lazy wind bracket.',
    notes: [
      'Rail and travel headroom for true long-range; match glass with enough elevation.',
      'Heavy magnum: bipod or tripod is almost mandatory for clean groups.',
      'Use 250–300 gr match loads; lighter pills waste the chambering.',
    ],
  },
  sentineltrg: {
    kind: 'rifle',
    role: 'Cold-weather .338 bolt · .338 Lapua Magnum',
    image: 'gear/sentineltrg.jpg',
    detail:
      'The Sentinel TRG is the other way to own a mile in .338 Lapua Magnum. Same chambering as the Vanguard, different personality: slightly lighter, a smoother 2.2-second bolt stroke, and stock geometry built for long waits in bad weather. Precision sits near 0.3 MOA mechanical — a hair behind the Vanguard’s best days, but the hold often feels quieter once the bipod is set. You are not buying new ballistics; you are buying feel, balance, and a rifle that prefers patience over haste at the far end of the course.',
    notes: [
      'Same .338 LM ammo pool as the Vanguard once owned.',
      'Slightly lighter and quicker to cycle than LR338 — still a magnum recovery.',
      'Deep rail for mile work; bring glass and a real wind call.',
    ],
  },
  am50: {
    kind: 'rifle',
    role: 'Anti-materiel bolt gun · .50 BMG',
    image: 'gear/am50.jpg',
    detail:
      'The Hadron AM50 is an anti-materiel rifle first and a precision tool second. Thirteen and a half kilograms of steel and composite, a 29-inch barrel, and a slow 1:15 twist for heavy .50 projectiles. A 20 mil canted rail is built in so extreme long-range dope still fits under deep glass. Wind deflection shrinks because the bullet is a freight train, but recoil, blast, and cycle time grow with it. Transonic distance is measured in kilometres, not hundreds of metres. It is the wrong answer for a tight timed plate rack and the right answer when the problem is simply “too far, too hard, still standing.”',
    notes: [
      'Extreme mass and recoil — expect long recovery and loud signature without a can.',
      'Slow twist suited to heavy match and AP projectiles, not light hunting bullets.',
      '20 mil canted rail stacks with optic travel (usable elev = glass + rail).',
    ],
  },

  // --- glass (optics) ---
  'opt-duplex': {
    kind: 'optic',
    role: 'Hunting duplex · 3–9×40 · SFP · MOA',
    image: 'gear/opt-duplex.jpg',
    detail:
      'The Hunter 3–9×40 is a deer-camp scope with capped turrets and a plain duplex reticle. There are no mil marks, no tree, and no honest ranging scale — distance is estimated from target size and memory. Glass quality is serviceable in good light and soft in haze. It is free and fitted to teach that magnification alone does not make a marksman. Once stages ask for holds and dials, you will want something with a real reticle and open turrets.',
    notes: [
      'Capped turrets: fine for a fixed zero, poor for dialling wind mid-stage.',
      'SFP duplex — no mil/MOA marks for ranging or holdovers.',
      'Low glass score: mirage and haze wash out earlier than on match optics.',
    ],
  },
  'opt-mildot': {
    kind: 'optic',
    role: 'Match mil-dot · 4–16×50 · FFP · MIL',
    image: 'gear/opt-mildot.jpg',
    detail:
      'The Vector 4–16×50 puts a mil-dot reticle in the first focal plane so the subtension stays true at every power. Tenth-mil clicks and fourteen mils of elevation cover the bulk of intermediate course work. Glass is a clear step up from the hunter scope: edges stay usable and mirage starts to read as information rather than blur. This is the first optic that lets you range with the reticle, hold wind in mils, and trust the numbers when you change magnification mid-stage.',
    notes: [
      'FFP mil-dot: dots subtend the same mils at 4× and at 16×.',
      'MIL turrets match the reticle — dial and hold in the same unit.',
      'Solid all-rounder for wind stages before you need a Christmas-tree hold grid.',
    ],
  },
  'opt-sfp': {
    kind: 'optic',
    role: 'High-power SFP · 6–24×50 · MOA',
    image: 'gear/opt-sfp.jpg',
    detail:
      'The Meridian 6–24×50 buys brightness and top-end power at a middle price by keeping the reticle in the second focal plane. The mil-dot pattern is only true at 24×; at any other setting the same “one mil” mark is wrong by the magnification ratio. Shooters who forget and range at 12× will be almost 50% off on distance. When used correctly — true-at-mag for ranging, or pure dialling with known range — it is a bright, capable optic with generous travel.',
    notes: [
      'SFP trap: reticle is honest only at 24×. Label it, or you will mis-range.',
      'MOA turrets with ¼ MOA clicks — convert carefully if your dope is in mils.',
      'Better glass than the Vector; still not Ardent-class for deep mirage reading.',
    ],
  },
  'opt-tree': {
    kind: 'optic',
    role: 'Christmas-tree FFP · 5–25×56 · MIL',
    image: 'gear/opt-tree.jpg',
    detail:
      'The Ardent 5–25×56 is a modern precision optic: first focal plane Christmas-tree reticle, 0.1 mil clicks, and 26 mils of elevation so you can hold wind and drop without spinning turrets under time. The 56 mm objective and high glass score keep the picture readable when the desert floor starts to boil. Tree hold points turn a good wind call into a fast second shot. Weight sits over a kilogram — the rifle will notice it on unsupported holds.',
    notes: [
      'Tree reticle: wind and drop holds without leaving the glass.',
      '26 MIL up covers magnum dope well into long-range stages.',
      'FFP at every power — zoom for clarity, not for reticle math.',
    ],
  },
  'opt-elite': {
    kind: 'optic',
    role: 'Elite long-range FFP · 7–35×56 · MIL',
    image: 'gear/opt-elite.jpg',
    detail:
      'The Ardent 7–35×56 is the top of the rack: thirty-five power, full glass clarity, thirty-two mils of travel, and a tree reticle fine enough to hold fractional wind at a mile. At that magnification the mirage is no longer noise — it is a wind gauge if you know how to read it. Field of view at the low end is tight; you aim with data, not with a wide search. Heavy, expensive, and unforgiving of a dirty objective or a bad zero.',
    notes: [
      '35× turns mirage into readable wind layers when glass is clean.',
      '32 MIL elevation for .338 / .50 class trajectories.',
      'Narrow FOV at high power — find the target at 7–12×, then zoom for the shot.',
    ],
  },
  'opt-horizon': {
    kind: 'optic',
    role: 'Competition ELR FFP · 8–80×56 · MIL',
    image: 'gear/opt-horizon.jpg',
    detail:
      'The Horizon 8–80×56 is purpose-built for extreme long range: sixty mils of internal elevation, eighty power so a 1.5 m plate fills the glass, and a first-focal-plane tree reticle that stays true while you zoom. Stacked on the Hadron’s canted rail you get ~80 mils of usable dial — enough for 3500 m .50 dope. Field of view at 80× is a tunnel — find the target at 10–15×, then zoom for the hold.',
    notes: [
      '60 MIL glass + AM50 20 MIL rail ≈ 80 MIL usable — covers Horizon stage dials.',
      '80× is for mirage and group analysis, not for searching — start low.',
      'Pairs with the Hadron AM50 and a ballistic solver that knows latitude.',
    ],
  },

  // --- muzzle devices ---
  'muz-none': {
    kind: 'muzzle',
    role: 'Threaded bare muzzle · protector only',
    image: 'gear/muz-none.jpg',
    detail:
      'Nothing on the threads except a protector. Full report, full flash, and whatever dust the blast lifts off the berm. Recoil and velocity are exactly what the cartridge and barrel deliver — no free lunch, no extra mass on the end of the tube. Useful when you want an honest signature for training, or when every gram on the muzzle would upset a carefully tuned barrel. Most shooters graduate to a brake or can once stages punish recovery time or spotting your own position.',
    notes: [
      'Baseline recoil, velocity, and dispersion for the loadout math.',
      'Loud and bright — easy for a spotter (or the course) to locate you.',
      'Zero mass: no change to barrel harmonics from a device.',
    ],
  },
  'muz-brake': {
    kind: 'muzzle',
    role: 'Compensating muzzle brake',
    image: 'gear/muz-brake.jpg',
    detail:
      'The Terminator Brake vents gas sideways and up to cut felt recoil nearly in half. The reticle settles faster, which is everything on a magnum follow-up. The cost is signature: more dust, more flash, and a report that is louder for the shooter and anyone beside the line. Precision takes a small hit from the gas violence at the crown. Fit it when recovery matters more than staying invisible.',
    notes: [
      'Recoil factor ~55% — big win on .300 / .338 / .50 follow-ups.',
      'Signature and loudness go up; expect dust clouds on dry ground.',
      'Slight dispersion penalty from turbulent exit gases.',
    ],
  },
  'muz-can': {
    kind: 'muzzle',
    role: 'Full-size suppressor',
    image: 'gear/muz-can.jpg',
    detail:
      'The Hushmark suppressor traps and cools gas before it leaves the system. Report drops hard, flash nearly vanishes, and the dust signature that gives away a brake is mostly gone. A little free velocity from the extra dwell time is common; so is a lot of mass hanging on the muzzle, which slows transitions and can shift point of impact until you re-zero. For training and stealth-minded stages it is the cleanest muzzle choice if you can afford the weight and the credits.',
    notes: [
      'Low signature and loudness — harder to spot your firing point.',
      'Small MV gain (~+35 fps) and mild dispersion cost.',
      'Heavy (~0.62 kg): affects hold and may need a fresh zero after fit.',
    ],
  },
  'muz-tuner': {
    kind: 'muzzle',
    role: 'Muzzle harmonic tuner',
    image: 'gear/muz-tuner.jpg',
    detail:
      'The Harmonic Tuner is a precision weight, not a blast device. By shifting barrel whip timing it can tighten groups a few hundredths of an MOA when the load likes the node. Recoil and report stay essentially bare-muzzle; velocity may drop a touch from the added end-mass. There is no free suppression and no free recovery — only a quieter barrel in the frequency domain. Competitive shooters fit it when the rifle is already sorted and the last fraction of group size is the goal.',
    notes: [
      'Dispersion improvement is the whole point; recoil stays near 100%.',
      'Slight MV loss possible; confirm with a chrono if you dial tight dope.',
      'Light device — less hold penalty than a full can.',
    ],
  },
};

export function itemDetailById(id: string): ItemDetail | undefined {
  return ITEM_DETAILS[id];
}
