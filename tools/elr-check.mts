import { ICAO } from '../src/core/atmosphere.ts';
import { solve, zeroAngle } from '../src/core/ballistics.ts';
import { radToMil } from '../src/core/units.ts';
import { resolveLoadout } from '../src/core/loadout.ts';
import { usableElevationMils } from '../src/core/scope.ts';
import type { LoadoutSelection } from '../src/core/store.ts';

const sel: LoadoutSelection = {
  rifleId: 'am50', cartridgeId: '50-800', opticId: 'opt-horizon',
  muzzleId: 'muz-brake', supportId: 'sup-tripod',
  gearIds: ['gear-solver'], zeroRangeM: 100,
};
const lo = resolveLoadout(sel);
const usable = usableElevationMils(lo.optic, lo.rifle);
console.log('usable elev', usable, '(glass', lo.optic.elevationTravelMils, '+ rail', lo.rifle.railMils, ')');
const env = { atmosphere: ICAO, wind: { speed: 0, fromAngle: 0 }, latitude: 0, azimuth: 0 };
const zero = zeroAngle(lo.projectile, env, 100, lo.rifle.sightHeightM);
for (const r of [1609, 2475, 3000, 3218, 3540]) {
  const sol = solve(lo.projectile, env, r, lo.rifle.sightHeightM);
  const elev = radToMil(sol.elevation - zero);
  console.log(r, 'need', elev.toFixed(2), elev <= usable + 0.05 ? 'DIAL OK' : 'STILL OUT');
}