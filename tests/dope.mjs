/**
 * Not a test — a table printer. Run `npm run dope` to eyeball the solver's
 * output against a published ballistic calculator. If these numbers drift,
 * something in the drag model or the atmosphere moved.
 */
import { ICAO } from '../src/core/atmosphere.ts';
import { resolveLoadout } from '../src/core/loadout.ts';
import { buildDope } from '../src/core/scope.ts';
import { msToFps, mToYard } from '../src/core/units.ts';

const LOADOUTS = [
  { name: '.308 / 175 SMK / 24in', rifleId: 'ranger24', cartridgeId: '308-175' },
  { name: '6.5 CM / 140 ELD / 26in', rifleId: 'prs26', cartridgeId: '65-140' },
  { name: '.338 LM / 300 SMK / 27in', rifleId: 'lr338', cartridgeId: '338-300' },
  { name: '.50 BMG / 750 AMAX / 29in', rifleId: 'am50', cartridgeId: '50-750' },
];

for (const spec of LOADOUTS) {
  const loadout = resolveLoadout(
    {
      rifleId: spec.rifleId,
      cartridgeId: spec.cartridgeId,
      opticId: 'opt-tree',
      muzzleId: 'muz-none',
      supportId: 'sup-bipod',
      gearIds: [],
      zeroRangeM: 100,
    },
    ICAO,
  );

  const t0 = performance.now();
  const dope = buildDope(loadout, ICAO);
  const ms = performance.now() - t0;

  console.log(`\n=== ${spec.name} ===`);
  console.log(
    `MV ${msToFps(loadout.muzzleVelocity).toFixed(0)} fps   SG ${loadout.stability.toFixed(
      2,
    )}   dispersion ${loadout.dispersionMoa.toFixed(2)} MOA   card built in ${ms.toFixed(0)} ms`,
  );
  console.log('  range     yd    elev     wind10    spin     tof     vel    mach');
  for (const r of dope.rows) {
    console.log(
      `  ${String(r.rangeM).padStart(5)} m ${mToYard(r.rangeM).toFixed(0).padStart(6)}` +
        ` ${r.elevationMil.toFixed(2).padStart(7)} ${r.wind10Mil.toFixed(2).padStart(9)}` +
        ` ${r.spinMil.toFixed(2).padStart(8)} ${r.tof.toFixed(2).padStart(7)}` +
        ` ${msToFps(r.velocity).toFixed(0).padStart(7)} ${r.mach.toFixed(2).padStart(7)}`,
    );
  }
  console.log(`  transonic at ${dope.transonicRangeM ?? 'never'} m`);
}
