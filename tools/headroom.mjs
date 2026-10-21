/**
 * How many rounds a stage actually costs a shooter who does everything right.
 *
 * Dials the true solution for each plate, aims dead centre, and fires until it
 * falls — through the real session, so barrel heat, cold bore, per-round
 * velocity spread and the transonic cone all apply. What it cannot model is
 * the player: no sway, no misread wind, and a perfect dial every time. So the
 * number it prints is a floor, and a stage that needs most of its budget here
 * has none left for a human.
 *
 * Build it first, because it imports the game's own source:
 *   npx esbuild tools/headroom.mjs --bundle --platform=node --format=esm \
 *     --outfile=node_modules/.cache/headroom.mjs
 *   node node_modules/.cache/headroom.mjs
 *
 * Environment:
 *   TRIALS=n     runs per stage (default 400; long stages are slow)
 *   ONLY=a,b     only these stage ids
 *   DIAG=id      per-plate breakdown for one stage: rounds, hit rate, Mach
 *   DEMAND=1     remove the budget and the clock, so what comes back is what
 *                the stage costs rather than what its budget allows. This is
 *                the number to size a budget against.
 */
import { STAGES } from '../src/core/range.ts';
import { createSession, fireRound, tick, trueSolution } from '../src/core/session.ts';
import { radToClicks, clampScope } from '../src/core/scope.ts';
import { DEFAULT_LOADOUT } from '../src/core/loadout.ts';
import { targetInclination, targetOffsetAt } from '../src/core/range.ts';

const TRIALS = Number(process.env.TRIALS ?? 400);
const LOADOUT = { ...DEFAULT_LOADOUT, gearIds: [] };

const machOf = new Map();

function runStage(stage, trial) {
  const session = createSession(stage, LOADOUT, false, false);
  // Decorrelate trials: the session seeds its rng from the stage, which is the
  // point in play and useless here.
  let s = (stage.seed ^ (trial * 2654435761)) >>> 0;
  session.rng = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  session.phase = 'live';
  // DEMAND mode removes the budget and the clock, so what comes back is what
  // the stage actually costs rather than what its budget allows.
  if (process.env.DEMAND) {
    session.roundsLeft = 9999;
    session.practice = true;
  }

  let rounds = 0;
  for (const runtime of session.targets) {
    const target = runtime.target;
    // Wait for an exposure window if the plate is not up yet.
    while (session.clockS < runtime.availableAtS && session.phase === 'live') tick(session, 0.5);
    while (!runtime.hit && session.roundsLeft > 0 && session.phase === 'live') {
      if (session.clockS >= runtime.goneAtS) break;
      if (process.env.DEMAND && runtime.roundsSent > 60) break;
      const solution = trueSolution(session, target);
      session.scope = clampScope(
        session.loadout.optic,
        {
          ...session.scope,
          elevationClicks: Math.round(radToClicks(session.loadout.optic, solution.elevation - session.zero)),
          windageClicks: Math.round(radToClicks(session.loadout.optic, solution.windage)),
        },
        session.loadout.rifle,
      );
      if (!Number.isFinite(session.scope.elevationClicks)) {
        throw new Error('dial is not a number — the harness is lying');
      }
      const lateral = targetOffsetAt(target, session.clockS + solution.tof);
      const aimAz = target.azimuth + lateral / Math.max(1, target.rangeM);
      const aimEl = targetInclination(target, stage.firingHeightM);
      const out = fireRound(session, aimAz, aimEl, 0);
      if (!out) break;
      machOf.set(target.id, out.shot.impactMach);
      rounds += 1;
      // A real shooter needs time to work the bolt, spot and re-dial.
      tick(session, 6);
    }
  }
  const down = session.targets.filter((t) => t.hit).length;
  const perPlate = session.targets.map((t) => [t.target.id, t.roundsSent, t.hit]);
  return { rounds, down, total: session.targets.length, clockS: session.clockS, perPlate };
}

const rows = [];
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
for (const stage of STAGES) {
  if (only && !only.includes(stage.id)) continue;
  let roundsSum = 0;
  let clears = 0;
  let timeouts = 0;
  let worst = 0;
  for (let i = 0; i < TRIALS; i++) {
    const r = runStage(stage, i);
    roundsSum += r.rounds;
    if (r.down === r.total) clears += 1;
    if (Number.isFinite(stage.timeLimitS) && r.clockS > stage.timeLimitS) timeouts += 1;
    worst = Math.max(worst, r.rounds);
  }
  const mean = roundsSum / TRIALS;
  const row = {
    id: stage.id,
    plates: stage.targets.length,
    budget: stage.rounds,
    mean: mean.toFixed(2),
    worst,
    headroom: (stage.rounds / Math.max(0.01, mean)).toFixed(2),
    clear: `${((clears / TRIALS) * 100).toFixed(0)}%`,
    timeOver: `${((timeouts / TRIALS) * 100).toFixed(0)}%`,
  };
  rows.push(row);
  console.log(JSON.stringify(row));
}
console.table(rows);

// Per-plate diagnostics for one stage: how often a dead-centre, perfectly
// dialled shot actually lands on each plate.
if (process.env.DIAG) {
  const stage = STAGES.find((s) => s.id === process.env.DIAG);
  const N = 300;
  const tally = new Map();
  for (let i = 0; i < N; i++) {
    const r = runStage(stage, i + 7777);
    for (const [id, sent, hit] of r.perPlate) {
      const e = tally.get(id) ?? { sent: 0, hit: 0 };
      e.sent += sent;
      e.hit += hit ? 1 : 0;
      tally.set(id, e);
    }
  }
  console.log(`--- ${stage.id} (${N} runs) ---`);
  for (const target of stage.targets) {
    const e = tally.get(target.id);
    console.log(
      `${target.id}  ${target.rangeM}m  ${target.shape}  ${(target.widthM * 100).toFixed(0)}x${(target.tallM * 100).toFixed(0)}cm  ` +
        `rounds/plate ${(e.sent / N).toFixed(2)}  fell ${((e.hit / N) * 100).toFixed(0)}%  arrives M${(machOf.get(target.id) ?? 0).toFixed(2)}`,
    );
  }
}
