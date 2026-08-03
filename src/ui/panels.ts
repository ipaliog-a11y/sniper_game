import { densityAltitude } from '../core/atmosphere';
import { type Rect, fillPanel, inset, measure, paragraph, rule, text } from './gfx';
import {
  type Session,
  dialMils,
  trueSolution,
} from '../core/session';
import { type Target, targetInclination } from '../core/range';
import {
  clampScope,
  clickValue,
  dialUnitLabel,
  formatDial,
  interpolateDope,
  maxElevationClicks,
  maxWindageClicks,
  radToClicks,
} from '../core/scope';
import {
  MIL,
  cToF,
  clamp,
  mToYard,
  msToMph,
  mToFt,
  paToInHg,
  radToMil,
  radToMoa,
} from '../core/units';
import { clockFace, effectiveWind, estimateConditions, windValue, zoneWindAt } from '../core/weather';
import type { Settings } from '../core/store';
import { C, T, type Scroll, type Ui } from './ui';

/**
 * The instruments. Every panel here is deliberately only as informative as the
 * kit on the rifle allows: without a weather meter the atmosphere is a rounded
 * guess, without a rangefinder the distances are blank, and without a solver
 * nobody does the arithmetic for you.
 */

export interface PanelContext {
  ui: Ui;
  session: Session;
  settings: Settings;
  time: number;
  gauge: number;
}

const dist = (m: number, imperial: boolean) =>
  imperial ? `${Math.round(mToYard(m))} yd` : `${Math.round(m)} m`;

const speed = (ms: number, imperial: boolean) =>
  imperial ? `${msToMph(ms).toFixed(1)} mph` : `${ms.toFixed(1)} m/s`;

const temp = (c: number, imperial: boolean) =>
  imperial ? `${cToF(c).toFixed(0)} F` : `${c.toFixed(0)} C`;

// --- weather ------------------------------------------------------------

export function weatherPanel(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  p: PanelContext,
): void {
  const { session, settings, ui } = p;
  const g = p.gauge;
  const conditions = session.conditions;
  const precise = session.loadout.hasGear('kestrel');
  const est = estimateConditions(conditions, precise);

  let y = r.y + 14 * g;
  const col = r.w / 2 - 10 * g;

  text(ctx, precise ? 'WEATHER METER' : 'FIELD ESTIMATE', r.x, y, T.small * g, precise ? C.amber : C.textFaint);
  if (!precise) {
    text(ctx, 'no meter fitted', r.x + r.w, y, T.micro * g, C.textFaint, 'right');
  }
  y += 16 * g;
  rule(ctx, r.x, y, r.w);
  y += 16 * g;

  const rows: Array<[string, string]> = [
    ['TEMPERATURE', temp(est.tempC, settings.imperial)],
    ['STATION PRESS', settings.imperial ? `${paToInHg(est.pressurePa).toFixed(2)} inHg` : `${(est.pressurePa / 100).toFixed(0)} hPa`],
    ['HUMIDITY', `${(est.humidity * 100).toFixed(0)} %`],
    ['ELEVATION', settings.imperial ? `${Math.round(mToFt(est.altitudeM))} ft` : `${Math.round(est.altitudeM)} m`],
    ['DENSITY ALT', settings.imperial ? `${Math.round(mToFt(est.densityAltitudeM))} ft` : `${Math.round(est.densityAltitudeM)} m`],
  ];
  for (let i = 0; i < rows.length; i++) {
    const x = i < 3 ? r.x : r.x + col + 20 * g;
    const ry = i < 3 ? y + i * 22 * g : y + (i - 3) * 22 * g;
    ui.field(x, ry, col, rows[i][0], rows[i][1]);
  }
  y += 3 * 22 * g + 8 * g;

  // How far today's air is from the day the card was written.
  const cardDa = densityAltitude(session.dope.atmosphere);
  const delta = est.densityAltitudeM - cardDa;
  const daNote =
    Math.abs(delta) < 150
      ? 'Air is close to what the card assumes.'
      : `Air is ${Math.abs(Math.round(delta))} m of density altitude ${
          delta > 0 ? 'thinner' : 'thicker'
        } than the card. Expect to ${delta > 0 ? 'dial less' : 'dial more'}.`;
  paragraph(ctx, daNote, r.x, y, r.w, T.small * g, delta > 150 || delta < -150 ? C.amber : C.textDim);
  y += 26 * g;

  rule(ctx, r.x, y, r.w);
  y += 16 * g;
  text(ctx, 'WIND', r.x, y, T.small * g, C.textFaint);
  y += 18 * g;

  for (const zone of conditions.zones) {
    const w = zoneWindAt(zone, p.time);
    const label = `${dist(zone.distanceM, settings.imperial).padEnd(8)} ${zone.indicator}`;
    text(ctx, label, r.x, y, T.small * g, C.textDim);
    const call = precise && zone.distanceM < 60
      ? `${speed(w.speed, settings.imperial)} @ ${clockFace(w.fromAngle)} o'clock`
      : `${clockFace(w.fromAngle)} o'clock, ${windValue(w.fromAngle)}`;
    text(ctx, call, r.x + r.w, y, T.small * g, C.text, 'right');
    y += 18 * g;
  }

  y += 8 * g;
  // A strip chart of the crosswind over the last half minute. The wind is
  // deterministic, so this is a genuine record rather than a decoration — and
  // the lulls in it are where the shots go.
  const chart: Rect = { x: r.x, y, w: r.w, h: 54 * g };
  fillPanel(ctx, chart, 4, 'rgba(8,11,10,0.6)', C.edgeSoft);
  const maxRange = session.stage.targets.reduce((m, t) => Math.max(m, t.rangeM), 600);
  let peak = 0.5;
  const samples: number[] = [];
  for (let i = 0; i <= 90; i++) {
    const t = p.time - 30 + (i / 90) * 30;
    const w = effectiveWind(conditions, maxRange, Math.max(0, t));
    const cross = Math.sin(w.fromAngle) * w.speed;
    samples.push(cross);
    peak = Math.max(peak, Math.abs(cross));
  }
  ctx.strokeStyle = C.edgeSoft;
  ctx.beginPath();
  ctx.moveTo(chart.x, chart.y + chart.h / 2);
  ctx.lineTo(chart.x + chart.w, chart.y + chart.h / 2);
  ctx.stroke();
  ctx.beginPath();
  samples.forEach((v, i) => {
    const x = chart.x + (i / (samples.length - 1)) * chart.w;
    const cy = chart.y + chart.h / 2 - (v / peak) * (chart.h / 2 - 4 * g);
    if (i === 0) ctx.moveTo(x, cy);
    else ctx.lineTo(x, cy);
  });
  ctx.strokeStyle = C.blue;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  text(ctx, `crosswind, last 30 s   peak ${speed(peak, settings.imperial)}`, chart.x + 6 * g, chart.y + 9 * g, T.micro * g, C.textFaint);
  text(ctx, 'now', chart.x + chart.w - 6 * g, chart.y + chart.h - 9 * g, T.micro * g, C.textFaint, 'right');
  y += chart.h + 14 * g;

  const lat = (conditions.latitude * 180) / Math.PI;
  const az = (conditions.azimuth * 180) / Math.PI;
  ui.field(r.x, y, r.w, 'LATITUDE / FACING', `${lat.toFixed(0)}°  ${az.toFixed(0)}° true`);
}

// --- data card ----------------------------------------------------------

export function dopePanel(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  p: PanelContext,
  scroll: Scroll,
): void {
  const { session, settings } = p;
  const g = p.gauge;
  const dope = session.dope;
  const solverFitted = session.loadout.hasGear('solver');
  const lrf = session.loadout.hasGear('lrf');

  let y = r.y + 12 * g;
  text(ctx, 'DATA CARD', r.x, y, T.small * g, C.amber);
  text(
    ctx,
    `${session.loadout.cartridge.name} · ${session.loadout.rifle.name}`,
    r.x + r.w,
    y,
    T.micro * g,
    C.textFaint,
    'right',
  );
  y += 14 * g;
  text(
    ctx,
    `zeroed ${dist(dope.zeroRangeM, settings.imperial)} · standard air · wind column is a full-value 10 mph`,
    r.x,
    y,
    T.micro * g,
    C.textFaint,
  );
  y += 14 * g;

  const head = y;
  const cols = [0, 0.3, 0.5, 0.68, 0.84];
  const headers = ['RANGE', 'ELEV', 'WIND', 'TOF', 'MACH'];
  headers.forEach((h, i) => {
    text(ctx, h, r.x + r.w * cols[i], head, T.micro * g, C.textFaint, i === 0 ? 'left' : 'right');
  });
  y += 12 * g;
  rule(ctx, r.x, y, r.w);
  y += 4 * g;

  const view: Rect = { x: r.x, y, w: r.w, h: r.h - (y - r.y) - 4 * g };
  const rowH = 20 * g;
  scroll.update(p.ui.input, view, dope.rows.length * rowH + 8 * g, 1 / 60);

  ctx.save();
  ctx.beginPath();
  ctx.rect(view.x, view.y, view.w, view.h);
  ctx.clip();

  const targetRanges = new Set(session.stage.targets.map((t) => Math.round(t.rangeM / 100) * 100));
  dope.rows.forEach((row, i) => {
    const ry = view.y + 10 * g + i * rowH - scroll.offset;
    if (ry < view.y - rowH || ry > view.y + view.h + rowH) return;
    const near = targetRanges.has(row.rangeM);
    const dim = row.mach < 1.2;
    if (near) {
      ctx.fillStyle = 'rgba(232,163,61,0.07)';
      ctx.fillRect(view.x, ry - rowH / 2, view.w, rowH);
    }
    const colour = dim ? C.red : near ? C.text : C.textDim;
    text(ctx, dist(row.rangeM, settings.imperial), r.x, ry, T.small * g, colour);
    text(ctx, row.elevationMil.toFixed(1), r.x + r.w * cols[1], ry, T.small * g, colour, 'right');
    text(ctx, row.wind10Mil.toFixed(1), r.x + r.w * cols[2], ry, T.small * g, colour, 'right');
    text(ctx, `${row.tof.toFixed(2)}s`, r.x + r.w * cols[3], ry, T.small * g, colour, 'right');
    text(ctx, row.mach.toFixed(2), r.x + r.w * cols[4], ry, T.small * g, colour, 'right');
  });
  ctx.restore();

  if (dope.transonicRangeM) {
    text(
      ctx,
      `transonic beyond ${dist(dope.transonicRangeM, settings.imperial)} — groups open up past there`,
      r.x,
      r.y + r.h - 6 * g,
      T.micro * g,
      C.red,
    );
  }
  if (!solverFitted && !lrf) {
    text(
      ctx,
      'mil the target, divide, read the card',
      r.x + r.w,
      r.y + r.h - 6 * g,
      T.micro * g,
      C.textFaint,
      'right',
    );
  }
}

// --- turrets ------------------------------------------------------------

export interface TurretResult {
  changed: boolean;
}

export function turretPanel(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  p: PanelContext,
  onClick: () => void,
): TurretResult {
  const { session, ui, settings } = p;
  const g = p.gauge;
  const optic = session.loadout.optic;
  const unit = dialUnitLabel(optic);
  const step = clickValue(optic);
  let changed = false;

  let y = r.y + 12 * g;
  text(ctx, 'TURRETS', r.x, y, T.small * g, C.amber);
  text(ctx, `${optic.name} · ${step}${unit}/click`, r.x + r.w, y, T.micro * g, C.textFaint, 'right');
  y += 16 * g;
  rule(ctx, r.x, y, r.w);
  y += 12 * g;

  const rowH = 44 * g;
  const btn = 40 * g;

  const dialRow = (
    id: string,
    label: string,
    clicks: number,
    maxClicks: number,
    minClicks: number,
    apply: (v: number) => void,
  ): void => {
    text(ctx, label, r.x, y + 8 * g, T.micro * g, C.textFaint);
    const readout = formatDial(optic, clicks);
    text(ctx, readout, r.x, y + 26 * g, T.head * g, C.text, 'left', 'bold');
    text(ctx, `${clicks > 0 ? '+' : ''}${clicks} clicks`, r.x + 110 * g, y + 26 * g, T.small * g, C.textFaint);

    const bx = r.x + r.w - btn * 4 - 18 * g;
    const buttons: Array<[string, number]> = [
      ['−−', -10],
      ['−', -1],
      ['+', 1],
      ['++', 10],
    ];
    buttons.forEach(([glyph, delta], i) => {
      const rect: Rect = { x: bx + i * (btn + 6 * g), y: y + 6 * g, w: btn, h: btn };
      const next = clamp(clicks + delta, minClicks, maxClicks);
      const disabled = next === clicks;
      if (ui.stepper(`${id}${i}`, rect, glyph, disabled)) {
        apply(next);
        changed = true;
        onClick();
      }
    });
    y += rowH + 12 * g;
  };

  const maxE = maxElevationClicks(optic);
  const maxW = maxWindageClicks(optic);
  dialRow('elev', `ELEVATION  ·  ${optic.elevationTravelMils} MIL of travel`, session.scope.elevationClicks, maxE, -Math.round(maxE * 0.25), (v) => {
    session.scope.elevationClicks = v;
  });
  dialRow('wind', 'WINDAGE', session.scope.windageClicks, maxW, -maxW, (v) => {
    session.scope.windageClicks = v;
  });

  // What the current elevation is good for, read back off the card. Dialling
  // by feel and then checking the range it corresponds to is how a shooter
  // catches a turret they turned the wrong way.
  const dialledMil = radToMil(session.scope.elevationClicks * optic.clickRad);
  const rows = session.dope.rows;
  let bestRow = rows[0];
  for (const row of rows) {
    if (Math.abs(row.elevationMil - dialledMil) < Math.abs(bestRow.elevationMil - dialledMil)) {
      bestRow = row;
    }
  }
  if (bestRow) {
    text(
      ctx,
      `that is about ${dist(bestRow.rangeM, settings.imperial)} on the card`,
      r.x,
      y,
      T.small * g,
      C.textDim,
    );
  }
  y += 20 * g;

  rule(ctx, r.x, y, r.w);
  y += 18 * g;

  text(ctx, 'MAGNIFICATION', r.x, y, T.micro * g, C.textFaint);
  text(ctx, `${session.scope.magnification.toFixed(1)}x`, r.x + r.w, y, T.body * g, C.text, 'right');
  y += 18 * g;
  const magSlider: Rect = { x: r.x, y, w: r.w, h: 20 * g };
  const nextMag = ui.slider('mag', magSlider, session.scope.magnification, optic.magMin, optic.magMax);
  if (Math.abs(nextMag - session.scope.magnification) > 0.001) {
    session.scope.magnification = nextMag;
    changed = true;
  }
  y += 30 * g;

  if (!optic.ffp) {
    text(
      ctx,
      `second focal plane — the reticle only subtends true mils at ${optic.trueAtMag}x`,
      r.x,
      y,
      T.micro * g,
      session.scope.magnification < optic.trueAtMag - 0.05 ? C.red : C.textFaint,
    );
    y += 18 * g;
  }

  text(ctx, 'PARALLAX', r.x, y, T.micro * g, C.textFaint);
  text(ctx, dist(session.scope.parallaxM, settings.imperial), r.x + r.w, y, T.body * g, C.text, 'right');
  y += 18 * g;
  const parSlider: Rect = { x: r.x, y, w: r.w, h: 20 * g };
  const nextPar = ui.slider('par', parSlider, session.scope.parallaxM, 50, 2000);
  if (Math.abs(nextPar - session.scope.parallaxM) > 0.5) {
    session.scope.parallaxM = nextPar;
    changed = true;
  }

  session.scope = clampScope(optic, session.scope);
  return { changed };
}

/**
 * The solver's answer for one target — but only if the kit to produce it is on
 * the rifle. This is where a rangefinder, a weather meter and a ballistic
 * computer earn their weight.
 */
export function solutionPanel(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  p: PanelContext,
  target: Target | null,
  onDial: (elevationClicks: number, windageClicks: number) => void,
): void {
  const { session, ui, settings } = p;
  const g = p.gauge;
  const optic = session.loadout.optic;
  const hasLrf = session.loadout.hasGear('lrf');
  const hasSolver = session.loadout.hasGear('solver');
  const assist = p.settings.assist;

  let y = r.y + 12 * g;
  text(ctx, 'FIRING SOLUTION', r.x, y, T.small * g, C.amber);
  y += 16 * g;
  rule(ctx, r.x, y, r.w);
  y += 14 * g;

  if (!target) {
    paragraph(ctx, 'Put the reticle on a target to work up a solution for it.', r.x, y, r.w, T.small * g);
    return;
  }

  const rangeKnown = hasLrf || assist || session.known[target.id] !== undefined;
  const rangeM = hasLrf || assist ? target.rangeM : session.known[target.id];

  ui.field(
    r.x,
    y,
    r.w,
    'RANGE',
    rangeKnown ? dist(rangeM, settings.imperial) : 'unknown — mil it',
    rangeKnown ? C.text : C.textFaint,
  );
  y += 22 * g;
  ui.field(
    r.x,
    y,
    r.w,
    'ANGLE',
    `${((targetInclination(target, session.stage.firingHeightM) * 180) / Math.PI).toFixed(1)}°`,
  );
  y += 22 * g;
  ui.field(r.x, y, r.w, 'TARGET', `${(target.knownSizeM * 100).toFixed(0)} cm tall`);
  y += 26 * g;

  if (!hasSolver && !assist) {
    paragraph(
      ctx,
      'No ballistic solver fitted. Read the elevation off the data card for that range, then correct it yourself for the air and the wind.',
      r.x,
      y,
      r.w,
      T.small * g,
    );
    if (rangeKnown) {
      const row = interpolateDope(session.dope, rangeM);
      if (row) {
        y += 48 * g;
        ui.field(r.x, y, r.w, 'CARD ELEVATION', `${row.elevationMil.toFixed(1)} MIL`, C.amber);
        y += 22 * g;
        ui.field(r.x, y, r.w, 'CARD WIND / 10 MPH', `${row.wind10Mil.toFixed(1)} MIL`, C.amber);
      }
    }
    return;
  }

  if (!rangeKnown) {
    paragraph(ctx, 'The solver needs a distance. Mil the target or fit a rangefinder.', r.x, y, r.w, T.small * g, C.red);
    return;
  }

  const solution = trueSolution(session, target);
  const elevMil = dialMils(session, solution);
  const windMil = radToMil(solution.windage);
  const elevClicks = Math.round(radToClicks(optic, elevMil * MIL));
  const windClicks = Math.round(radToClicks(optic, windMil * MIL));

  ui.field(
    r.x,
    y,
    r.w,
    'ELEVATION',
    optic.turretUnit === 'MIL'
      ? `${elevMil.toFixed(1)} MIL`
      : `${radToMoa(elevMil * MIL).toFixed(2)} MOA`,
    C.amber,
  );
  y += 22 * g;
  ui.field(
    r.x,
    y,
    r.w,
    'WINDAGE',
    optic.turretUnit === 'MIL'
      ? `${windMil.toFixed(2)} MIL ${windMil >= 0 ? 'R' : 'L'}`
      : `${radToMoa(windMil * MIL).toFixed(2)} MOA ${windMil >= 0 ? 'R' : 'L'}`,
    C.amber,
  );
  y += 22 * g;
  ui.field(r.x, y, r.w, 'TIME OF FLIGHT', `${solution.tof.toFixed(2)} s`);
  y += 22 * g;
  ui.field(
    r.x,
    y,
    r.w,
    'AT THE TARGET',
    `${solution.impactSpeed.toFixed(0)} m/s · Mach ${solution.impactMach.toFixed(2)}`,
    solution.transonic ? C.red : C.text,
  );
  y += 22 * g;
  ui.field(r.x, y, r.w, 'SPIN DRIFT', `${(solution.spinDrift * 100).toFixed(1)} cm right`);
  y += 30 * g;

  if (target.moverSpeed) {
    const lead = target.moverSpeed * solution.tof;
    ui.field(r.x, y, r.w, 'LEAD', `${lead.toFixed(2)} m · ${((lead / target.rangeM) * 1000).toFixed(2)} MIL`, C.amber);
    y += 30 * g;
  }

  const overTravel = Math.abs(elevClicks) > maxElevationClicks(optic);
  const dialBtn: Rect = { x: r.x, y, w: r.w, h: 42 * g };
  if (ui.button(dialBtn, overTravel ? 'NOT ENOUGH ELEVATION' : 'DIAL IT', { accent: !overTravel, disabled: overTravel })) {
    onDial(elevClicks, windClicks);
  }
  if (overTravel) {
    y += 50 * g;
    paragraph(
      ctx,
      'The scope has run out of travel. Hold the correction on the reticle instead, or fit glass with more of it.',
      r.x,
      y,
      r.w,
      T.small * g,
      C.red,
    );
  }
}

export { inset, measure };
