/**
 * The maths, checked without a browser. Two things matter here: that the drag
 * model still agrees with published trajectory data, and that the geometry the
 * game scores against is self-consistent — a shot aimed dead centre has to land
 * dead centre, or nothing else in the game means anything.
 */
import { ICAO, airDensity, densityAltitude, speedOfSound } from '../src/core/atmosphere.ts';
import { fire, solve, spinDrift, zeroAngle } from '../src/core/ballistics.ts';
import { dragCoefficient } from '../src/core/drag.ts';
import { millerStability, resolveLoadout } from '../src/core/loadout.ts';
import { BIOMES, biomeById, pickPropKind } from '../src/core/biome.ts';
import {
  buildFreeFieldStage,
  defaultFreeFieldConfig,
  fullyRandomiseFreeField,
  suggestedRounds,
} from '../src/core/freeField.ts';
import {
  ACHIEVEMENTS,
  careerSummary,
  emptyCareer,
  ensureCareer,
  unlockAchievements,
} from '../src/core/career.ts';
import { STAGES, scoreImpact, targetInclination } from '../src/core/range.ts';
import { gaussian, makeRng } from '../src/core/rng.ts';
import { gradeFor, scoreTarget } from '../src/core/scoring.ts';
import { buildDope, fieldOfView, interpolateDope, reticleScale } from '../src/core/scope.ts';
import { createSession, fireRound, targetUnderAim, tick } from '../src/core/session.ts';
import {
  SAVE_FORMAT,
  bankRun,
  defaultProfile,
  hydrateProfile,
  parseSaveJson,
  saveFilename,
  serializeSave,
} from '../src/core/store.ts';
import {
  MIL,
  MOA,
  bcToSi,
  fpsToMs,
  milsFromRange,
  msToFps,
  mphToMs,
  radToMil,
  rangeFromMils,
  yardToM,
} from '../src/core/units.ts';
import { clockFace, effectiveWind, generateConditions, presetById } from '../src/core/weather.ts';

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function near(name, actual, expected, tolerance) {
  check(
    name,
    Math.abs(actual - expected) <= tolerance,
    `got ${actual.toFixed(4)}, wanted ${expected} ±${tolerance}`,
  );
}

const env = (wind = { speed: 0, fromAngle: 0 }, atmosphere = ICAO) => ({
  atmosphere,
  wind,
  latitude: 0,
  azimuth: 0,
});

// --- units --------------------------------------------------------------

near('one MOA is 1.047 inches at 100 yd', (MOA * yardToM(100)) / 0.0254, 1.047, 0.002);
near('one mil is 10 cm at 100 m', MIL * 100 * 100, 10, 0.001);
near('mil relation: 1 m at 4 mils is 250 m', rangeFromMils(1, 4), 250, 0.001);
near('mil relation inverts', milsFromRange(0.76, 500), 1.52, 0.001);
near('3 oclock is a right hand wind', clockFace(Math.PI / 2), 3, 0);
near('9 oclock is a left hand wind', clockFace(-Math.PI / 2), 9, 0);

// --- atmosphere ---------------------------------------------------------

near('ICAO density', airDensity(ICAO), 1.225, 0.001);
near('ICAO speed of sound', speedOfSound(ICAO), 340.3, 0.5);
near('ICAO is zero density altitude', densityAltitude(ICAO), 0, 5);

check(
  'humid air is lighter than dry air',
  airDensity({ ...ICAO, humidity: 1 }) < airDensity({ ...ICAO, humidity: 0 }),
);
check(
  'cold air is denser than warm air',
  airDensity({ ...ICAO, tempC: -10 }) > airDensity({ ...ICAO, tempC: 35 }),
);
check(
  'altitude thins the air',
  densityAltitude({ tempC: 30, pressurePa: 80000, humidity: 0.2, altitudeM: 2000 }) > 2000,
);

// --- drag ---------------------------------------------------------------

check('G7 drag peaks transonic', dragCoefficient('G7', 1.05) > dragCoefficient('G7', 2.5));
check('G1 drags harder than G7 supersonic', dragCoefficient('G1', 2) > dragCoefficient('G7', 2));
check('drag table clamps above Mach 5', dragCoefficient('G7', 40) === dragCoefficient('G7', 5));

/**
 * The load-bearing test. Retained velocity for two well-published loads, one
 * quoted against G1 and one against G7. If either of these drifts, the whole
 * game is lying about where the bullet goes.
 */
function retainedFps(bc, model, mvFps, yards) {
  const projectile = {
    bcSi: bcToSi(bc),
    dragModel: model,
    muzzleVelocity: fpsToMs(mvFps),
    stability: 2,
    rightHandTwist: true,
  };
  const geom = { aimAz: 0, aimEl: 0, boreEl: 0.002, boreAz: 0, cant: 0, sightHeight: 0.05 };
  return msToFps(fire(projectile, env(), geom, yardToM(yards), { dt: 0.0005 }).speed);
}

// Sierra 168 gr MatchKing, G1 0.462, 2700 fps.
near('168 SMK at 100 yd', retainedFps(0.462, 'G1', 2700, 100), 2513, 25);
near('168 SMK at 300 yd', retainedFps(0.462, 'G1', 2700, 300), 2160, 30);
near('168 SMK at 500 yd', retainedFps(0.462, 'G1', 2700, 500), 1834, 35);
near('168 SMK at 1000 yd', retainedFps(0.462, 'G1', 2700, 1000), 1180, 40);

// Hornady 140 gr ELD Match, G7 0.315, 2710 fps.
near('140 ELD at 100 yd', retainedFps(0.315, 'G7', 2710, 100), 2569, 20);
near('140 ELD at 500 yd', retainedFps(0.315, 'G7', 2710, 500), 2049, 30);
near('140 ELD at 1000 yd', retainedFps(0.315, 'G7', 2710, 1000), 1500, 45);

// --- the solver ---------------------------------------------------------

const testProjectile = {
  bcSi: bcToSi(0.243),
  dragModel: 'G7',
  muzzleVelocity: fpsToMs(2600),
  stability: 1.9,
  rightHandTwist: true,
};

const zero100 = zeroAngle(testProjectile, env(), 100, 0.05);
check('zero angle is a small positive number', zero100 > 0 && zero100 < 0.01);

{
  // A rifle zeroed at 100 m must put a round on the sight line at 100 m.
  const shot = fire(
    testProjectile,
    env(),
    { aimAz: 0, aimEl: 0, boreEl: zero100, boreAz: 0, cant: 0, sightHeight: 0.05 },
    100,
    { dt: 0.0002 },
  );
  near('zeroed rifle hits its zero', shot.up * 1000, 0, 2);
}

{
  const near300 = solve(testProjectile, env(), 300, 0.05);
  const far800 = solve(testProjectile, env(), 800, 0.05);
  check('further needs more elevation', far800.elevation > near300.elevation);
  check('time of flight grows with distance', far800.tof > near300.tof);
  check('the bullet slows down', far800.impactSpeed < near300.impactSpeed);

  // Solving and then shooting that solution must hit.
  const shot = fire(
    testProjectile,
    env(),
    { aimAz: 0, aimEl: 0, boreEl: far800.elevation, boreAz: far800.windage, cant: 0, sightHeight: 0.05 },
    800,
    { dt: 0.0002 },
  );
  near('the solution actually hits, vertically', shot.up * 100, 0, 3);
  near('the solution actually hits, horizontally', shot.right * 100, 0, 3);
}

{
  // Wind from the right pushes the bullet left, so the correction is right.
  const still = solve(testProjectile, env(), 600, 0.05);
  const fromRight = solve(testProjectile, env({ speed: mphToMs(10), fromAngle: Math.PI / 2 }), 600, 0.05);
  const fromLeft = solve(testProjectile, env({ speed: mphToMs(10), fromAngle: -Math.PI / 2 }), 600, 0.05);
  check('a right hand wind is held into, to the right', fromRight.windage > still.windage);
  check('a left hand wind mirrors it', fromLeft.windage < still.windage);
  near(
    'the two are symmetric about the still-air solution',
    (fromRight.windage + fromLeft.windage) / 2 - still.windage,
    0,
    1e-5,
  );

  const head = solve(testProjectile, env({ speed: mphToMs(10), fromAngle: 0 }), 600, 0.05);
  check(
    'a headwind moves the bullet far less than a crosswind',
    Math.abs(head.windage - still.windage) < Math.abs(fromRight.windage - still.windage) * 0.2,
  );
}

{
  // Thin air means less drag, so less elevation for the same distance.
  const sea = solve(testProjectile, env(), 800, 0.05);
  const high = solve(
    testProjectile,
    env(undefined, { tempC: 35, pressurePa: 78000, humidity: 0.1, altitudeM: 2200 }),
    800,
    0.05,
  );
  check('thin air needs less elevation', high.elevation < sea.elevation);
  check('and gets the bullet there sooner', high.tof < sea.tof);
}

{
  // Spin drift is always in the direction of the rifling, and grows.
  check('right hand twist drifts right', spinDrift(testProjectile, 1) > 0);
  check(
    'left hand twist drifts left',
    spinDrift({ ...testProjectile, rightHandTwist: false }, 1) < 0,
  );
  check(
    'drift grows faster than linearly with flight time',
    spinDrift(testProjectile, 2) > spinDrift(testProjectile, 1) * 2,
  );
}

{
  // Coriolis: in the northern hemisphere everything walks right, and firing
  // east lifts the bullet.
  const north = { atmosphere: ICAO, wind: { speed: 0, fromAngle: 0 }, latitude: 0.9, azimuth: 0 };
  const south = { ...north, latitude: -0.9 };
  const geom = { aimAz: 0, aimEl: 0, boreEl: 0.02, boreAz: 0, cant: 0, sightHeight: 0.05 };
  const shotN = fire(testProjectile, north, geom, 1000, { dt: 0.0005 });
  const shotS = fire(testProjectile, south, geom, 1000, { dt: 0.0005 });
  check('northern hemisphere throws right', shotN.right > shotS.right);

  const east = { ...north, latitude: 0, azimuth: Math.PI / 2 };
  const west = { ...north, latitude: 0, azimuth: -Math.PI / 2 };
  check(
    'firing east lands higher than firing west',
    fire(testProjectile, east, geom, 1000, { dt: 0.0005 }).up >
      fire(testProjectile, west, geom, 1000, { dt: 0.0005 }).up,
  );
}

{
  // Cant: elevation dialled on a rolled rifle leaks into windage.
  const level = fire(
    testProjectile,
    env(),
    { aimAz: 0, aimEl: 0, boreEl: 0.02, boreAz: 0, cant: 0, sightHeight: 0.05 },
    800,
    { dt: 0.0005 },
  );
  const rolled = fire(
    testProjectile,
    env(),
    { aimAz: 0, aimEl: 0, boreEl: 0.02, boreAz: 0, cant: 0.087, sightHeight: 0.05 },
    800,
    { dt: 0.0005 },
  );
  check('a canted rifle throws sideways', rolled.right - level.right > 0.5);
  check('and slightly low', rolled.up < level.up);
}

// --- stability ----------------------------------------------------------

{
  const smk175 = {
    grains: 175,
    diameterIn: 0.308,
    lengthIn: 1.24,
  };
  const sg = millerStability(smk175, 11.25, 2600, ICAO);
  near('175 SMK in a 1:11.25 twist is comfortably stable', sg, 1.9, 0.25);
  check('a slower twist destabilises it', millerStability(smk175, 14, 2600, ICAO) < sg);
  check(
    'cold dense air destabilises it further',
    millerStability(smk175, 11.25, 2600, { ...ICAO, tempC: -25 }) < sg,
  );
}

// --- optics -------------------------------------------------------------

{
  const ffp = { magMin: 5, magMax: 25, ffp: true, trueAtMag: 25, fovDegAtMin: 4.4 };
  const sfp = { ...ffp, ffp: false };
  check('front focal plane reticles never lie', reticleScale(ffp, 12) === 1);
  near('a second focal plane reticle at half power reads double', reticleScale(sfp, 12.5), 2, 0.001);
  check('field of view shrinks with magnification', fieldOfView(ffp, 25) < fieldOfView(ffp, 5));
  near('and does so proportionally', fieldOfView(ffp, 10) / fieldOfView(ffp, 20), 2, 0.001);
}

// --- data card ----------------------------------------------------------

const loadout = resolveLoadout({
  rifleId: 'prs26',
  cartridgeId: '65-140',
  opticId: 'opt-tree',
  muzzleId: 'muz-none',
  supportId: 'sup-bipod',
  gearIds: ['gear-lrf', 'gear-kestrel', 'gear-solver'],
  zeroRangeM: 100,
});

check('the loadout resolves the rifle we asked for', loadout.rifle.id === 'prs26');
check('gear lookups work', loadout.hasGear('lrf') && !loadout.hasGear('spotter'));
check('a longer barrel than reference is faster', msToFps(loadout.muzzleVelocity) >= 2700);

{
  const dope = buildDope(loadout, ICAO);
  check('the card has rows', dope.rows.length > 8);
  check('elevation only ever increases with range', dope.rows.every((row, i) => i === 0 || row.elevationMil > dope.rows[i - 1].elevationMil));
  check('wind hold only ever increases with range', dope.rows.every((row, i) => i === 0 || row.wind10Mil > dope.rows[i - 1].wind10Mil));
  check('the zero row needs no elevation', Math.abs(dope.rows[0].elevationMil) < 0.02);
  check('6.5 Creedmoor stays supersonic past 1000 m', (dope.transonicRangeM ?? 9999) > 1000);

  const mid = interpolateDope(dope, 550);
  check(
    'interpolation lands between the printed lines',
    mid.elevationMil > dope.rows[4].elevationMil && mid.elevationMil < dope.rows[5].elevationMil,
  );
  check('reading below the card returns the first row', interpolateDope(dope, 10).rangeM === 100);
}

// --- cold powder --------------------------------------------------------

{
  const warm = resolveLoadout({ ...loadout.selection }, { tempC: 30, pressurePa: 101325, humidity: 0.3, altitudeM: 0 });
  const cold = resolveLoadout({ ...loadout.selection }, { tempC: -20, pressurePa: 101325, humidity: 0.3, altitudeM: 0 });
  check('cold powder is slow powder', cold.muzzleVelocity < warm.muzzleVelocity);
  near('by about the quoted sensitivity', msToFps(warm.muzzleVelocity - cold.muzzleVelocity), 50 * 0.8, 6);
}

// --- target geometry ----------------------------------------------------

{
  const gong = { shape: 'gong', widthM: 0.4, tallM: 0.4, heightM: 0, rangeM: 500 };
  near('dead centre scores one', scoreImpact(gong, 0, 0), 1, 1e-9);
  check('just inside the edge still counts', scoreImpact(gong, 0.19, 0) > 0);
  check('outside the plate is a miss', scoreImpact(gong, 0.21, 0) === null);

  const silhouette = { shape: 'silhouette', widthM: 0.46, tallM: 0.76, heightM: 0, rangeM: 500 };
  check('centre mass on a silhouette is a hit', scoreImpact(silhouette, 0, -0.1) > 0.5);
  check('the head box is narrower than the shoulders', scoreImpact(silhouette, 0.2, 0.3) === null);
  check('but the head itself is on', scoreImpact(silhouette, 0, 0.3) > 0);

  const uphill = { ...gong, heightM: 200 };
  check('a target above you gives a positive angle', targetInclination(uphill, 20) > 0);
  check('and one below a negative one', targetInclination({ ...gong, heightM: -200 }, 20) < 0);
}

// --- scoring ------------------------------------------------------------

{
  const target = { id: 't', shape: 'gong', value: 1, widthM: 0.4, tallM: 0.4, rangeM: 500, heightM: 0 };
  const perfect = scoreTarget(target, true, 1, true, 4, 20, 1);
  const slow = scoreTarget(target, true, 1, true, 60, 20, 1);
  const scrappy = scoreTarget(target, true, 0.1, false, 18, 20, 4);
  const missed = scoreTarget(target, false, 0, false, 0, 20, 3);
  const practiceSlow = scoreTarget(target, true, 1, true, 60, 20, 1, true);

  check('a fast centred first round is worth the most', perfect.points > slow.points);
  check('a slow one still scores', slow.points > 0);
  check('a scrappy hit scores less than a clean one', scrappy.points < perfect.points);
  check('a miss is worth nothing', missed.points === 0);
  check('nothing can beat the maximum', perfect.points <= perfect.maxPoints);
  check('practice mode pays full speed even when slow', practiceSlow.points === perfect.points);
  // Hits dominate: a slow edge correction is still most of the target max.
  check(
    'a scrappy hit is still the bulk of the target score',
    scrappy.points >= scrappy.maxPoints * 0.55,
  );
  // Slow perfect first-round still clears Qualified-grade territory on its own.
  check('a slow clean hit pays well past half max', slow.points >= slow.maxPoints * 0.7);

  check('grades run in order', gradeFor(0.99) === 'Distinguished' && gradeFor(0.01) === 'Unqualified');
  check('a clean sweep of the middle grades', gradeFor(0.55) === 'Marksman');
  check('Qualified sits under Marksman', gradeFor(0.3) === 'Qualified');
  check('hit points dominate a clean target score', perfect.accuracyPoints >= perfect.firstRoundPoints + perfect.speedPoints);
  check('score breakdown sums to total', perfect.points === perfect.accuracyPoints + perfect.firstRoundPoints + perfect.speedPoints);
}

// --- weather ------------------------------------------------------------

{
  const conditions = generateConditions(presetById('switch'), 4242, 900);
  const again = generateConditions(presetById('switch'), 4242, 900);
  check('conditions are reproducible from a seed', conditions.atmosphere.tempC === again.atmosphere.tempC);
  check('a different seed gives different weather', generateConditions(presetById('switch'), 99, 900).atmosphere.tempC !== conditions.atmosphere.tempC);
  check('the range is divided into zones', conditions.zones.length >= 2);

  const a = effectiveWind(conditions, 900, 0);
  const b = effectiveWind(conditions, 900, 12);
  check('a switching wind actually switches', Math.abs(a.speed - b.speed) > 1e-6);

  // Wind weighting: the flag at the muzzle has to matter more than the one at
  // the target. Two zones, one of them still, and the weighted answer must lean
  // toward whichever end is blowing.
  const nearBlows = {
    ...conditions,
    zones: [
      { distanceM: 25, baseSpeed: 10, baseAngle: Math.PI / 2, volatility: 0, phase: 0, indicator: 'flag' },
      { distanceM: 800, baseSpeed: 0, baseAngle: Math.PI / 2, volatility: 0, phase: 0, indicator: 'flag' },
    ],
  };
  const farBlows = {
    ...nearBlows,
    zones: [
      { ...nearBlows.zones[0], baseSpeed: 0 },
      { ...nearBlows.zones[1], baseSpeed: 10 },
    ],
  };
  check(
    'wind near the muzzle counts for more than wind at the target',
    effectiveWind(nearBlows, 900, 0).speed > effectiveWind(farBlows, 900, 0).speed,
  );
}

// --- randomness ---------------------------------------------------------

{
  const rng = makeRng(7);
  const again = makeRng(7);
  check('the generator is deterministic', rng() === again());
  let sum = 0;
  let sumSq = 0;
  const n = 20000;
  const g = makeRng(11);
  for (let i = 0; i < n; i++) {
    const v = gaussian(g);
    sum += v;
    sumSq += v * v;
  }
  near('gaussian mean is zero', sum / n, 0, 0.04);
  near('gaussian variance is one', sumSq / n, 1, 0.06);
}

// --- a whole stage ------------------------------------------------------

{
  const session = createSession(
    {
      id: 'test',
      name: 'test',
      brief: '',
      presetId: 'calm',
      firingHeightM: 20,
      seed: 1234,
      rounds: 5,
      timeLimitS: 120,
      parPerTargetS: 20,
      ordered: false,
      reward: 100,
      unlockScore: 0,
      targets: [
        {
          id: 'a',
          shape: 'gong',
          rangeM: 400,
          azimuth: 0,
          heightM: 0,
          widthM: 0.5,
          tallM: 0.5,
          knownSizeM: 0.5,
          value: 1,
        },
      ],
    },
    {
      rifleId: 'prs26',
      cartridgeId: '65-140',
      opticId: 'opt-tree',
      muzzleId: 'muz-none',
      supportId: 'sup-tripod',
      gearIds: ['gear-lrf', 'gear-solver'],
      zeroRangeM: 100,
    },
  );
  session.phase = 'live';

  const target = session.targets[0].target;
  const aimEl = targetInclination(target, session.stage.firingHeightM);
  check('the reticle finds the plate it is on', targetUnderAim(session, 0, aimEl) !== null);
  check('and finds nothing when pointed away', targetUnderAim(session, 0.4, aimEl) === null);

  // Dial the true solution and take the shot. The rifle's own cone of fire and
  // the cold bore mean it will not be perfect, but it has to be on the plate.
  const solution = solve(
    session.loadout.projectile,
    {
      atmosphere: session.conditions.atmosphere,
      wind: effectiveWind(session.conditions, target.rangeM, 0),
      latitude: session.conditions.latitude,
      azimuth: session.conditions.azimuth,
    },
    target.rangeM,
    session.loadout.rifle.sightHeightM,
    aimEl,
  );
  session.scope.elevationClicks = Math.round((solution.elevation - session.zero) / session.loadout.optic.clickRad);
  session.scope.windageClicks = Math.round(solution.windage / session.loadout.optic.clickRad);

  const outcome = fireRound(session, 0, aimEl, 0);
  check('the round goes off', outcome !== null);
  check(
    'a dialled solution lands on the plate',
    outcome.shot.quality !== null,
    `missed by ${Math.hypot(outcome.shot.missRight, outcome.shot.missUp).toFixed(3)} m`,
  );
  check('ammunition is consumed', session.roundsLeft === 4);
  check('the plate goes down', session.targets[0].hit);
  check('and it counts as a first round hit', session.targets[0].firstRound);
  check('the stage ends when every plate is down', session.phase === 'complete');

  // The clock only runs while the stage does.
  const frozen = session.clockS;
  tick(session, 1);
  check('a finished stage stops its clock', session.clockS === frozen);
}

{
  // Ten dialled shots at 900 m: every one has to be within the rifle's own
  // dispersion of centre, or the sim is adding error it should not.
  const projectile = { ...testProjectile };
  const solution = solve(projectile, env(), 900, 0.05);
  let worst = 0;
  for (let i = 0; i < 10; i++) {
    const shot = fire(
      projectile,
      env(),
      { aimAz: 0, aimEl: 0, boreEl: solution.elevation, boreAz: solution.windage, cant: 0, sightHeight: 0.05 },
      900,
      { dt: 0.0005 },
    );
    worst = Math.max(worst, Math.hypot(shot.up, shot.right));
  }
  check('the solver is repeatable to within a centimetre at 900 m', worst < 0.01, `worst ${worst.toFixed(4)} m`);
  near('a 900 m solution is a sane number of mils', radToMil(solution.elevation - zero100), 9.2, 2.5);
}

// --- report -------------------------------------------------------------

// --- free field ---------------------------------------------------------

{
  const cfg = defaultFreeFieldConfig();
  check('default free field has plates', cfg.targets.length >= 1);
  const stage = buildFreeFieldStage(cfg);
  check('free field stage id', stage.id === 'free-field');
  check('free field is timeless', !Number.isFinite(stage.timeLimitS) || stage.timeLimitS > 1e9);
  check('free field pays no credits', stage.reward === 0);
  check('free field freeField flag', stage.freeField === true);
  check('free field plate count matches config', stage.targets.length === cfg.targets.length);
  check('suggested rounds covers plates', suggestedRounds(3) >= 3);

  // Known vs unknown disclosure
  cfg.targets[0].unknownRange = false;
  cfg.targets[1].unknownRange = true;
  const mixed = buildFreeFieldStage(cfg);
  check('known plate discloses range', mixed.targets[0].disclosedRange === true);
  check('unknown plate hides range', mixed.targets[1].disclosedRange === false);
  check('known plate has range label', Boolean(mixed.targets[0].label));
  check('unknown plate has no label', !mixed.targets[1].label);

  const session = createSession(
    mixed,
    {
      rifleId: 'ranger24',
      cartridgeId: '308-m80',
      opticId: 'opt-duplex',
      muzzleId: 'muz-none',
      supportId: 'sup-none',
      gearIds: [],
      zeroRangeM: 100,
    },
    false,
    true,
  );
  check('free field session flag', session.freeField === true);
  check('free field is timeless practice', session.practice === true);
  check('disclosed plate is pre-known', session.known[mixed.targets[0].id] === mixed.targets[0].rangeM);
  check('concealed plate is not pre-known', session.known[mixed.targets[1].id] === undefined);

  session.phase = 'live';
  const before = session.clockS;
  tick(session, 5);
  check('free field clock advances', session.clockS === before + 5);
  check('free field never times out', session.phase === 'live');

  const shuffled = fullyRandomiseFreeField(cfg);
  check('shuffle keeps plate count', shuffled.targets.length === cfg.targets.length);
  check('shuffle sets a weather preset', shuffled.weatherPresetId !== 'random');
  check('shuffle sets a scenery biome', shuffled.biomeId !== 'random');
  check('default free field has open scenery', defaultFreeFieldConfig().biomeId === 'open');

  cfg.biomeId = 'desert';
  const desertStage = buildFreeFieldStage(cfg);
  check('free field stage carries desert biome', desertStage.biomeId === 'desert');

  cfg.biomeId = 'random';
  cfg.seed = 42;
  const randomBiome = buildFreeFieldStage(cfg);
  check('random biome resolves to a real id', BIOMES.some((b) => b.id === randomBiome.biomeId));
}

// --- career / achievements ----------------------------------------------

{
  const profile = defaultProfile();
  ensureCareer(profile);
  check('fresh career has zero runs', profile.career.totals.runs === 0);
  check('achievement catalogue is non-empty', ACHIEVEMENTS.length >= 10);

  const { newAchievements, record } = bankRun(profile, {
    stageId: 'zero',
    fraction: 0.55,
    points: 400,
    grade: 'Marksman',
    timeS: 90,
    cleared: true,
    frhPercent: 80,
    meanRadialMil: 0.4,
    hits: 5,
    targets: 5,
    shots: 6,
    practice: false,
    freeField: false,
    reward: 500,
  });
  check('course run updates stage record', record != null && record.cleared === true);
  check('course run counts as course', profile.career.totals.courseRuns === 1);
  check('history logs the run', profile.career.history.length === 1);
  check('shots accumulate', profile.career.totals.shots === 6);
  check('credits earned tracked', profile.career.totals.creditsEarned === 500);
  check('first string medal unlocks', newAchievements.includes('first_string'));
  check('first clear medal unlocks', profile.career.unlocked.includes('first_clear'));
  check('tight group medal unlocks', profile.career.unlocked.includes('tight_group'));
  check('marksman ribbon unlocks', profile.career.unlocked.includes('grade_marksman'));

  // Free Field does not overwrite course bests.
  const bestBefore = profile.records.zero.bestFraction;
  bankRun(profile, {
    stageId: 'free-field',
    fraction: 0.99,
    points: 999,
    grade: 'Distinguished',
    timeS: 40,
    cleared: true,
    frhPercent: 100,
    meanRadialMil: 0.1,
    hits: 3,
    targets: 3,
    shots: 3,
    practice: true,
    freeField: true,
    reward: 0,
  });
  check('free field does not clobber course best', profile.records.zero.bestFraction === bestBefore);
  check('free field run counted', profile.career.totals.freeFieldRuns === 1);
  check('free field medal unlocks', profile.career.unlocked.includes('free_field_run'));

  const sum = careerSummary(profile);
  check('summary stages cleared at least one', sum.stagesCleared >= 1);
  check('summary tracks free field runs', sum.freeFieldRuns === 1);

  // Kit achievements via refresh path.
  profile.owned.push('opt-tree', 'gear-lrf', 'gear-kestrel', 'gear-solver');
  const kitMedals = unlockAchievements(profile);
  check('tree glass medal', kitMedals.includes('own_tree') || profile.career.unlocked.includes('own_tree'));
  check(
    'full sensors medal',
    kitMedals.includes('full_sensors') || profile.career.unlocked.includes('full_sensors'),
  );

  // Empty career clone is independent.
  const bare = emptyCareer();
  check('empty career has no history', bare.history.length === 0);
}

// --- save export / import -----------------------------------------------

{
  const profile = defaultProfile();
  profile.credits = 4242;
  profile.owned.push('opt-tree');
  profile.records.zero = {
    bestFraction: 0.8,
    bestPoints: 700,
    bestGrade: 'Sharpshooter',
    bestTimeS: 60,
    attempts: 2,
    cleared: true,
  };
  profile.career.totals.runs = 3;
  profile.career.unlocked.push('first_string');

  const json = serializeSave(profile);
  const envelope = JSON.parse(json);
  check('export format tag', envelope.format === SAVE_FORMAT);
  check('export version is positive', envelope.version >= 1);
  check('export embeds profile credits', envelope.profile.credits === 4242);

  const restored = parseSaveJson(json);
  check('import envelope restores credits', restored != null && restored.credits === 4242);
  check('import restores owned kit', restored != null && restored.owned.includes('opt-tree'));
  check(
    'import restores stage record',
    restored != null && restored.records.zero?.cleared === true,
  );
  check(
    'import restores career unlock',
    restored != null && restored.career.unlocked.includes('first_string'),
  );

  // Raw localStorage-style dump (no envelope) still imports.
  const rawDump = JSON.stringify(profile);
  const fromRaw = parseSaveJson(rawDump);
  check('raw profile dump imports', fromRaw != null && fromRaw.credits === 4242);

  check('garbage JSON rejects', parseSaveJson('{not json') === null);
  check('unrelated JSON rejects', parseSaveJson('{"hello":1}') === null);
  check('empty object rejects', parseSaveJson('{}') === null);

  // hydrate fills missing fields and keeps starter kit.
  const partial = hydrateProfile({ credits: 99, owned: ['lr338'] });
  check('hydrate keeps starter rifle', partial.owned.includes('ranger24'));
  check('hydrate adds custom owned', partial.owned.includes('lr338'));
  check('hydrate uses provided credits', partial.credits === 99);
  check('hydrate has career object', partial.career != null && Array.isArray(partial.career.history));

  check('save filename shape', /^coldbore-save-\d{4}-\d{2}-\d{2}\.json$/.test(saveFilename()));
}

// --- scenery biomes -----------------------------------------------------

{
  check('four biomes ship', BIOMES.length === 4);
  check('biomeById falls back to open', biomeById('nope').id === 'open');
  check('open has soft grass', BIOMES[0].props.some((p) => p.kind === 'grass' && p.sway));
  check('urban has buildings', biomeById('urban').props.some((p) => p.kind === 'building'));
  check('desert horizon is dunes', biomeById('desert').horizon === 'dunes');
  const kind = pickPropKind(biomeById('forest'), 0.01);
  check('pickPropKind returns a kind', typeof kind.kind === 'string');
  check(
    'every course stage has a biome',
    STAGES.every((s) => Boolean(s.biomeId)),
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
for (const f of failures) console.log(`  FAIL  ${f}`);
if (failed > 0) process.exit(1);
