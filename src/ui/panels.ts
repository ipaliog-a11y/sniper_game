import { densityAltitude } from '../core/atmosphere';
import type { TrajectoryPoint } from '../core/ballistics';
import { catalogName } from '../core/catalogLabels';
import { t } from '../core/i18n';
import { type Rect, fillPanel, inset, measure, paragraph, rule, text } from './gfx';
import {
  type Session,
  dialMils,
  trueSolution,
  trueSolutionNoCoriolis,
} from '../core/session';
import { type Target, targetCentreHeight, targetInclination } from '../core/range';
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
import type { ShotResult } from '../core/shot';
import {
  MIL,
  cToF,
  clamp,
  mToYard,
  msToFps,
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

/**
 * The weather station. Two columns wherever there is room, because a shooter
 * wants the air on one side and the wind on the other, and because a single
 * stack of this much data runs off the bottom of a laptop screen.
 */
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

  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();

  const twoUp = r.w > 520 * g;
  const colW = twoUp ? r.w / 2 - 14 * g : r.w;
  const rightX = twoUp ? r.x + r.w / 2 + 14 * g : r.x;

  // --- the air ---
  let y = r.y + 14 * g;
  text(
    ctx,
    precise ? t('panel.weather_meter') : t('panel.field_estimate'),
    r.x,
    y,
    T.small * g,
    precise ? C.amber : C.textFaint,
  );
  if (!precise) {
    text(ctx, t('panel.no_meter'), r.x + colW, y, T.micro * g, C.textFaint, 'right');
  }
  y += 14 * g;
  rule(ctx, r.x, y, colW);
  y += 16 * g;

  const rows: Array<[string, string]> = [
    [t('panel.temperature'), temp(est.tempC, settings.imperial)],
    [
      t('panel.station_pressure'),
      settings.imperial
        ? `${paToInHg(est.pressurePa).toFixed(2)} inHg`
        : `${(est.pressurePa / 100).toFixed(0)} hPa`,
    ],
    [t('panel.humidity'), `${(est.humidity * 100).toFixed(0)} %`],
    [
      t('panel.station_elevation'),
      settings.imperial ? `${Math.round(mToFt(est.altitudeM))} ft` : `${Math.round(est.altitudeM)} m`,
    ],
    [
      t('panel.density_altitude'),
      settings.imperial
        ? `${Math.round(mToFt(est.densityAltitudeM))} ft`
        : `${Math.round(est.densityAltitudeM)} m`,
    ],
  ];
  for (const [label, value] of rows) {
    ui.field(r.x, y, colW, label, value);
    y += 20 * g;
  }
  y += 6 * g;

  // How far today's air is from the day the card was written. This is the whole
  // reason a weather meter is worth carrying.
  const cardDa = densityAltitude(session.dope.atmosphere);
  const delta = est.densityAltitudeM - cardDa;
  const off = Math.abs(delta) >= 150;
  const daNote = off
    ? t('panel.da_off', {
        delta: Math.abs(Math.round(delta)),
        thinner: delta > 0 ? t('panel.thinner') : t('panel.thicker'),
        less: delta > 0 ? t('panel.less') : t('panel.more'),
      })
    : t('panel.da_ok');
  y += paragraph(ctx, daNote, r.x, y, colW, T.small * g, off ? C.amber : C.textDim);
  y += 10 * g;

  const lat = (conditions.latitude * 180) / Math.PI;
  const az = (conditions.azimuth * 180) / Math.PI;
  ui.field(r.x, y, colW, t('panel.lat_facing'), `${lat.toFixed(0)}°  ${az.toFixed(0)}° true`);

  // --- the wind ---
  let w = twoUp ? r.y + 14 * g : y + 30 * g;
  text(ctx, t('panel.wind'), rightX, w, T.small * g, C.amber);
  text(
    ctx,
    precise ? t('panel.metered_fp') : t('panel.read_flags'),
    rightX + colW,
    w,
    T.micro * g,
    C.textFaint,
    'right',
  );
  w += 14 * g;
  rule(ctx, rightX, w, colW);
  w += 16 * g;

  for (const zone of conditions.zones) {
    const wind = zoneWindAt(zone, p.time);
    text(ctx, dist(zone.distanceM, settings.imperial), rightX, w, T.small * g, C.textDim);
    text(ctx, zone.indicator, rightX + 62 * g, w, T.micro * g, C.textFaint);
    // Only the meter in your hand gives you a number, and only where you are.
    const call =
      precise && zone.distanceM < 60
        ? t('panel.oclock_speed', {
            speed: speed(wind.speed, settings.imperial),
            clock: clockFace(wind.fromAngle),
          })
        : `${t('panel.oclock', { clock: clockFace(wind.fromAngle) })}, ${windValue(wind.fromAngle)}`;
    ui.fitText(call, rightX + colW, w, colW - 100 * g, T.small * g, C.text, 'right');
    w += 19 * g;
  }
  w += 10 * g;

  // A strip chart of the crosswind over the last half minute. The wind is
  // deterministic, so this is a genuine record rather than a decoration — and
  // the lulls in it are where the shots go.
  const chartH = Math.min(64 * g, Math.max(40 * g, r.y + r.h - w - 8 * g));
  const chart: Rect = { x: rightX, y: w, w: colW, h: chartH };
  if (chart.h > 30 * g) {
    fillPanel(ctx, chart, 4, 'rgba(8,11,10,0.6)', C.edgeSoft);
    const maxRange = session.stage.targets.reduce((m, t) => Math.max(m, t.rangeM), 600);
    let peak = 0.5;
    const samples: number[] = [];
    for (let i = 0; i <= 90; i++) {
      const t = p.time - 30 + (i / 90) * 30;
      const wind = effectiveWind(conditions, maxRange, Math.max(0, t));
      const cross = Math.sin(wind.fromAngle) * wind.speed;
      samples.push(cross);
      peak = Math.max(peak, Math.abs(cross));
    }
    ctx.strokeStyle = C.edgeSoft;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chart.x, chart.y + chart.h / 2);
    ctx.lineTo(chart.x + chart.w, chart.y + chart.h / 2);
    ctx.stroke();
    ctx.beginPath();
    samples.forEach((v, i) => {
      const x = chart.x + (i / (samples.length - 1)) * chart.w;
      const cy = chart.y + chart.h / 2 - (v / peak) * (chart.h / 2 - 9 * g);
      if (i === 0) ctx.moveTo(x, cy);
      else ctx.lineTo(x, cy);
    });
    ctx.strokeStyle = C.blue;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    text(
      ctx,
      t('panel.crosswind_chart', { peak: speed(peak, settings.imperial) }),
      chart.x + 6 * g,
      chart.y + 9 * g,
      T.micro * g,
      C.textFaint,
    );
    text(
      ctx,
      t('panel.now'),
      chart.x + chart.w - 6 * g,
      chart.y + chart.h - 9 * g,
      T.micro * g,
      C.textFaint,
      'right',
    );
  }

  ctx.restore();
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
  text(ctx, t('panel.data_card'), r.x, y, T.small * g, C.amber);
  text(
    ctx,
    `${catalogName(session.loadout.cartridge.id, session.loadout.cartridge.name)} · ${catalogName(session.loadout.rifle.id, session.loadout.rifle.name)}`,
    r.x + r.w,
    y,
    T.micro * g,
    C.textFaint,
    'right',
  );
  y += 14 * g;
  text(
    ctx,
    t('panel.zeroed', { zero: dist(dope.zeroRangeM, settings.imperial) }),
    r.x,
    y,
    T.micro * g,
    C.textFaint,
  );
  y += 14 * g;

  const head = y;
  const cols = [0, 0.3, 0.5, 0.68, 0.84];
  const headers = [
    t('panel.range'),
    t('panel.elev'),
    t('panel.wind'),
    t('panel.tof'),
    t('panel.mach'),
  ];
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
      t('panel.transonic_beyond', { range: dist(dope.transonicRangeM, settings.imperial) }),
      r.x,
      r.y + r.h - 6 * g,
      T.micro * g,
      C.red,
    );
  }
  if (!solverFitted && !lrf) {
    text(
      ctx,
      t('panel.mil_divide'),
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

  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y - 4 * g, r.w, r.h + 8 * g);
  ctx.clip();

  let y = r.y + 12 * g;
  text(ctx, t('panel.turrets'), r.x, y, T.small * g, C.amber);
  text(
    ctx,
    `${catalogName(optic.id, optic.name)} · ${step}${unit}/click`,
    r.x + r.w,
    y,
    T.micro * g,
    C.textFaint,
    'right',
  );
  y += 16 * g;
  rule(ctx, r.x, y, r.w);
  y += 12 * g;

  const rowH = 36 * g;
  const btn = 34 * g;

  const dialRow = (
    id: string,
    label: string,
    clicks: number,
    maxClicks: number,
    minClicks: number,
    apply: (v: number) => void,
  ): void => {
    text(ctx, label, r.x, y + 6 * g, T.micro * g, C.textFaint);
    const readout = formatDial(optic, clicks);
    text(ctx, readout, r.x, y + 24 * g, T.head * g, C.text, 'left', 'bold');
    text(
      ctx,
      t('panel.clicks', { n: `${clicks > 0 ? '+' : ''}${clicks}` }),
      r.x + 104 * g,
      y + 24 * g,
      T.small * g,
      C.textFaint,
    );

    // −− − 0 + ++  — centre button returns the turret to mechanical zero.
    const glyphs: Array<[string, number | 'zero']> = [
      ['−−', -10],
      ['−', -1],
      [t('panel.zero_btn'), 'zero'],
      ['+', 1],
      ['++', 10],
    ];
    const gap = 5 * g;
    const totalW = glyphs.length * btn + (glyphs.length - 1) * gap;
    const bx = r.x + r.w - totalW;
    glyphs.forEach(([glyph, delta], i) => {
      const rect: Rect = { x: bx + i * (btn + gap), y: y + 4 * g, w: btn, h: btn };
      const next = delta === 'zero' ? 0 : clamp(clicks + delta, minClicks, maxClicks);
      const disabled = next === clicks;
      if (ui.stepper(`${id}${i}`, rect, glyph, disabled)) {
        apply(next);
        changed = true;
        onClick();
      }
    });
    y += rowH + 8 * g;
  };

  const maxE = maxElevationClicks(optic);
  const maxW = maxWindageClicks(optic);
  dialRow(
    'elev',
    t('panel.elevation_travel', { mils: optic.elevationTravelMils }),
    session.scope.elevationClicks,
    maxE,
    -Math.round(maxE * 0.25),
    (v) => {
      session.scope.elevationClicks = v;
    },
  );
  dialRow('wind', t('panel.windage'), session.scope.windageClicks, maxW, -maxW, (v) => {
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
      t('panel.about_range', { range: dist(bestRow.rangeM, settings.imperial) }),
      r.x,
      y,
      T.small * g,
      C.textDim,
    );
  }
  y += 18 * g;

  if (session.stage.id === 'tutorial') {
    const tipH = paragraph(
      ctx,
      t('panel.tutorial_dial_tip'),
      r.x,
      y,
      r.w,
      T.small * g,
      C.amber,
    );
    y += tipH + 10 * g;
  }

  rule(ctx, r.x, y, r.w);
  y += 16 * g;

  text(ctx, t('panel.magnification'), r.x, y, T.micro * g, C.textFaint);
  text(ctx, `${session.scope.magnification.toFixed(1)}x`, r.x + r.w, y, T.body * g, C.text, 'right');
  y += 18 * g;
  const magSlider: Rect = { x: r.x, y, w: r.w, h: 20 * g };
  const nextMag = ui.slider('mag', magSlider, session.scope.magnification, optic.magMin, optic.magMax);
  if (Math.abs(nextMag - session.scope.magnification) > 0.001) {
    session.scope.magnification = nextMag;
    changed = true;
  }
  y += 26 * g;

  if (!optic.ffp) {
    text(
      ctx,
      t('panel.sfp_note', { mag: optic.trueAtMag }),
      r.x,
      y,
      T.micro * g,
      session.scope.magnification < optic.trueAtMag - 0.05 ? C.red : C.textFaint,
    );
    y += 16 * g;
  }

  text(ctx, t('panel.parallax'), r.x, y, T.micro * g, C.textFaint);
  text(ctx, dist(session.scope.parallaxM, settings.imperial), r.x + r.w, y, T.body * g, C.text, 'right');
  y += 18 * g;
  const parSlider: Rect = { x: r.x, y, w: r.w, h: 20 * g };
  const nextPar = ui.slider('par', parSlider, session.scope.parallaxM, 50, 4000);
  if (Math.abs(nextPar - session.scope.parallaxM) > 0.5) {
    session.scope.parallaxM = nextPar;
    changed = true;
  }

  session.scope = clampScope(optic, session.scope);
  ctx.restore();
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
  text(ctx, t('panel.firing_solution'), r.x, y, T.small * g, C.amber);
  y += 16 * g;
  rule(ctx, r.x, y, r.w);
  y += 14 * g;

  if (!target) {
    paragraph(ctx, t('panel.put_reticle'), r.x, y, r.w, T.small * g);
    return;
  }

  const rangeKnown = hasLrf || assist || session.known[target.id] !== undefined;
  const rangeM = hasLrf || assist ? target.rangeM : session.known[target.id];

  ui.field(
    r.x,
    y,
    r.w,
    t('panel.range'),
    rangeKnown ? dist(rangeM, settings.imperial) : t('panel.unknown_mil'),
    rangeKnown ? C.text : C.textFaint,
  );
  y += 22 * g;
  ui.field(
    r.x,
    y,
    r.w,
    t('panel.angle'),
    `${((targetInclination(target, session.stage.firingHeightM) * 180) / Math.PI).toFixed(1)}°`,
  );
  y += 22 * g;
  ui.field(
    r.x,
    y,
    r.w,
    t('panel.target'),
    t('panel.target_tall', { cm: (target.knownSizeM * 100).toFixed(0) }),
  );
  y += 26 * g;

  if (!hasSolver && !assist) {
    paragraph(ctx, t('panel.no_solver'), r.x, y, r.w, T.small * g);
    if (rangeKnown) {
      const row = interpolateDope(session.dope, rangeM);
      if (row) {
        y += 48 * g;
        ui.field(
          r.x,
          y,
          r.w,
          t('panel.card_elevation'),
          `${row.elevationMil.toFixed(1)} MIL`,
          C.amber,
        );
        y += 22 * g;
        ui.field(
          r.x,
          y,
          r.w,
          t('panel.card_wind'),
          `${row.wind10Mil.toFixed(1)} MIL`,
          C.amber,
        );
      }
    }
    return;
  }

  if (!rangeKnown) {
    paragraph(ctx, t('panel.solver_needs_range'), r.x, y, r.w, T.small * g, C.red);
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
    t('panel.elevation'),
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
    t('panel.windage'),
    optic.turretUnit === 'MIL'
      ? `${windMil.toFixed(2)} MIL ${windMil >= 0 ? 'R' : 'L'}`
      : `${radToMoa(windMil * MIL).toFixed(2)} MOA ${windMil >= 0 ? 'R' : 'L'}`,
    C.amber,
  );
  y += 22 * g;
  ui.field(r.x, y, r.w, t('panel.time_of_flight'), `${solution.tof.toFixed(2)} s`);
  y += 22 * g;
  ui.field(
    r.x,
    y,
    r.w,
    t('panel.at_target'),
    `${solution.impactSpeed.toFixed(0)} m/s · Mach ${solution.impactMach.toFixed(2)}`,
    solution.transonic ? C.red : C.text,
  );
  y += 22 * g;
  ui.field(
    r.x,
    y,
    r.w,
    t('panel.spin_drift'),
    t('panel.spin_right', { cm: (solution.spinDrift * 100).toFixed(1) }),
  );
  y += 22 * g;

  // Isolate Earth-rate Coriolis by re-solving with latitude = 0.
  const noCoriolis = trueSolutionNoCoriolis(session, target);
  const corHMil = radToMil(solution.windage - noCoriolis.windage);
  const corVMil = radToMil(solution.elevation - noCoriolis.elevation);
  const latDeg = (session.conditions.latitude * 180) / Math.PI;
  ui.field(
    r.x,
    y,
    r.w,
    t('panel.coriolis'),
    t('panel.coriolis_value', {
      h: `${corHMil >= 0 ? '+' : ''}${corHMil.toFixed(2)}`,
      v: `${corVMil >= 0 ? '+' : ''}${corVMil.toFixed(2)}`,
      lat: latDeg.toFixed(0),
    }),
    Math.hypot(corHMil, corVMil) > 0.05 ? C.amber : C.text,
  );
  y += 30 * g;

  if (target.moverSpeed) {
    const lead = target.moverSpeed * solution.tof;
    ui.field(
      r.x,
      y,
      r.w,
      t('panel.lead'),
      `${lead.toFixed(2)} m · ${((lead / target.rangeM) * 1000).toFixed(2)} MIL`,
      C.amber,
    );
    y += 30 * g;
  }

  const overTravel = Math.abs(elevClicks) > maxElevationClicks(optic);
  const dialBtn: Rect = { x: r.x, y, w: r.w, h: 42 * g };
  if (
    ui.button(dialBtn, overTravel ? t('panel.not_enough_elev') : t('panel.dial_it'), {
      accent: !overTravel,
      disabled: overTravel,
    })
  ) {
    onDial(elevClicks, windClicks);
  }
  if (overTravel) {
    y += 50 * g;
    paragraph(ctx, t('panel.out_of_travel'), r.x, y, r.w, T.small * g, C.red);
  }
}

// --- trajectory plotter (gear) ------------------------------------------

/** Sample on the path the shooter has selected by tapping / scrubbing the chart. */
export interface TrajProbe {
  index: number;
  rangeM: number;
  heightM: number;
  speed: number;
  mach: number;
  t: number;
}

export interface TrajPanelState {
  /** Index into session.shots. */
  shotIndex: number;
  probe: TrajProbe | null;
}

/** Horizontal range and height of a path sample relative to the muzzle. */
function pathSample(p: TrajectoryPoint, origin: TrajectoryPoint): { rangeM: number; heightM: number } {
  const dx = p.pos.x - origin.pos.x;
  const dy = p.pos.y - origin.pos.y;
  const dz = p.pos.z - origin.pos.z;
  return {
    rangeM: Math.hypot(dx, dz),
    heightM: dy,
  };
}

function nearestPathIndex(path: TrajectoryPoint[], rangeM: number): number {
  if (path.length === 0) return 0;
  const origin = path[0];
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < path.length; i++) {
    const s = pathSample(path[i], origin);
    const d = Math.abs(s.rangeM - rangeM);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function makeProbe(path: TrajectoryPoint[], index: number): TrajProbe {
  const origin = path[0];
  const p = path[clamp(index, 0, path.length - 1)];
  const s = pathSample(p, origin);
  return {
    index,
    rangeM: s.rangeM,
    heightM: s.heightM,
    speed: p.speed,
    mach: p.mach,
    t: p.t,
  };
}

/**
 * Side-view of the last (or selected) round: rifle → path → impact, plates
 * marked downrange. Tap or drag the curve for range, height and speed at that
 * point. Only meaningful with the trajectory plotter gear fitted.
 */
export function trajectoryPanel(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  p: PanelContext,
  state: TrajPanelState,
  onState: (next: TrajPanelState) => void,
): void {
  const { session, ui, settings } = p;
  const g = p.gauge;
  const imperial = settings.imperial;
  const shots = session.shots;

  let y = r.y + 10 * g;
  text(ctx, t('panel.traj_title'), r.x, y, T.small * g, C.amber);
  y += 14 * g;

  if (!session.loadout.hasGear('traj')) {
    paragraph(ctx, t('panel.traj_no_gear'), r.x, y, r.w, T.small * g);
    return;
  }
  if (shots.length === 0) {
    paragraph(ctx, t('panel.traj_no_shot'), r.x, y, r.w, T.small * g);
    return;
  }

  const shotIndex = clamp(state.shotIndex, 0, shots.length - 1);
  const entry = shots[shotIndex];
  const shot: ShotResult = entry.shot;
  const path = shot.path;
  if (path.length < 2) {
    paragraph(ctx, t('panel.traj_no_path'), r.x, y, r.w, T.small * g);
    return;
  }

  // Shot picker when more than one round is on the string.
  if (shots.length > 1) {
    const btnW = 36 * g;
    const prev: Rect = { x: r.x, y: y - 4 * g, w: btnW, h: 22 * g };
    const next: Rect = { x: r.x + r.w - btnW, y: y - 4 * g, w: btnW, h: 22 * g };
    if (ui.button(prev, '‹', { size: T.body * g, disabled: shotIndex <= 0 })) {
      onState({ shotIndex: shotIndex - 1, probe: null });
      return;
    }
    if (ui.button(next, '›', { size: T.body * g, disabled: shotIndex >= shots.length - 1 })) {
      onState({ shotIndex: shotIndex + 1, probe: null });
      return;
    }
    text(
      ctx,
      t('panel.traj_shot_n', { n: shotIndex + 1, total: shots.length }),
      r.x + r.w / 2,
      y + 6 * g,
      T.micro * g,
      C.textDim,
      'center',
    );
    y += 22 * g;
  }

  const origin = path[0];
  const samples = path.map((pt) => pathSample(pt, origin));
  const maxRange = Math.max(
    samples[samples.length - 1].rangeM,
    ...session.stage.targets.map((tg) => tg.rangeM),
    50,
  );
  let minH = 0;
  let maxH = 0.5;
  for (const s of samples) {
    minH = Math.min(minH, s.heightM);
    maxH = Math.max(maxH, s.heightM);
  }
  // Include plate centres so markers sit inside the plot.
  for (const tg of session.stage.targets) {
    const h = targetCentreHeight(tg) - session.stage.firingHeightM;
    minH = Math.min(minH, h - tg.tallM / 2);
    maxH = Math.max(maxH, h + tg.tallM / 2);
  }
  const hPad = Math.max(0.4, (maxH - minH) * 0.12);
  minH -= hPad;
  maxH += hPad;

  // Nearest plate to impact (or the one engaged).
  const impactRange = samples[samples.length - 1].rangeM;
  let nearest: Target | null = null;
  let nearestDist = Infinity;
  if (entry.targetId) {
    nearest = session.stage.targets.find((tg) => tg.id === entry.targetId) ?? null;
  }
  if (!nearest) {
    for (const tg of session.stage.targets) {
      const d = Math.abs(tg.rangeM - impactRange);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = tg;
      }
    }
  }

  const chart: Rect = {
    x: r.x,
    y: y + 4 * g,
    w: r.w,
    h: Math.min(r.h * 0.48, 200 * g),
  };
  fillPanel(ctx, chart, 6, C.bgDeep, C.edgeSoft);

  const padL = 8 * g;
  const padR = 8 * g;
  const padT = 10 * g;
  const padB = 18 * g;
  const plotW = chart.w - padL - padR;
  const plotH = chart.h - padT - padB;

  const toX = (rangeM: number) => chart.x + padL + (rangeM / maxRange) * plotW;
  const toY = (heightM: number) =>
    chart.y + padT + plotH - ((heightM - minH) / Math.max(1e-6, maxH - minH)) * plotH;

  // Ground reference at optic height 0 (horizontal line).
  const y0 = toY(0);
  ctx.strokeStyle = C.edgeSoft;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(chart.x + padL, y0);
  ctx.lineTo(chart.x + chart.w - padR, y0);
  ctx.stroke();

  // Range ticks.
  const tickStep =
    maxRange > 1500 ? 500 : maxRange > 800 ? 200 : maxRange > 400 ? 100 : maxRange > 150 ? 50 : 25;
  ctx.fillStyle = C.textFaint;
  for (let d = 0; d <= maxRange + 0.1; d += tickStep) {
    const x = toX(d);
    ctx.beginPath();
    ctx.moveTo(x, chart.y + padT);
    ctx.lineTo(x, chart.y + chart.h - padB + 3 * g);
    ctx.strokeStyle = 'rgba(43,58,51,0.55)';
    ctx.stroke();
    const label = imperial ? `${Math.round(mToYard(d))}` : `${Math.round(d)}`;
    text(ctx, label, x, chart.y + chart.h - 6 * g, T.micro * g, C.textFaint, 'center');
  }

  // Target markers (vertical spans at plate range).
  for (const tg of session.stage.targets) {
    const cx = toX(tg.rangeM);
    const centreH = targetCentreHeight(tg) - session.stage.firingHeightM;
    const top = toY(centreH + tg.tallM / 2);
    const bot = toY(centreH - tg.tallM / 2);
    const isNearest = nearest?.id === tg.id;
    const isHit = session.targets.find((rt) => rt.target.id === tg.id)?.hit;
    ctx.strokeStyle = isNearest ? C.amber : isHit ? C.green : C.edge;
    ctx.lineWidth = isNearest ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(cx, top);
    ctx.lineTo(cx, bot);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, toY(centreH), isNearest ? 3.5 * g : 2.5 * g, 0, Math.PI * 2);
    ctx.fillStyle = isNearest ? C.amber : isHit ? C.green : C.textFaint;
    ctx.fill();
  }

  // Trajectory curve.
  ctx.strokeStyle = C.amber;
  ctx.lineWidth = 2;
  ctx.beginPath();
  samples.forEach((s, i) => {
    const x = toX(s.rangeM);
    const yy = toY(s.heightM);
    if (i === 0) ctx.moveTo(x, yy);
    else ctx.lineTo(x, yy);
  });
  ctx.stroke();

  // Muzzle and impact markers.
  ctx.fillStyle = C.green;
  ctx.beginPath();
  ctx.arc(toX(samples[0].rangeM), toY(samples[0].heightM), 3.5 * g, 0, Math.PI * 2);
  ctx.fill();
  const last = samples[samples.length - 1];
  ctx.fillStyle = shot.quality !== null ? C.green : C.red;
  ctx.beginPath();
  ctx.arc(toX(last.rangeM), toY(last.heightM), 3.5 * g, 0, Math.PI * 2);
  ctx.fill();

  // Probe from tap / scrub on the chart.
  let probe = state.probe;
  const pointerOnChart = ui.input.isDownIn(chart.x, chart.y, chart.w, chart.h);
  const tappedChart = ui.input.takeTap(chart.x, chart.y, chart.w, chart.h);
  if (pointerOnChart || tappedChart) {
    const px = ui.input.hoverX;
    const rangeAt = ((px - (chart.x + padL)) / Math.max(1, plotW)) * maxRange;
    const idx = nearestPathIndex(path, clamp(rangeAt, 0, maxRange));
    probe = makeProbe(path, idx);
    if (
      !state.probe ||
      state.probe.index !== probe.index ||
      state.shotIndex !== shotIndex
    ) {
      onState({ shotIndex, probe });
    }
  } else if (!probe) {
    // Default cursor on impact.
    probe = makeProbe(path, path.length - 1);
  }

  // Probe crosshair + readout point.
  if (probe) {
    const px = toX(probe.rangeM);
    const py = toY(probe.heightM);
    ctx.strokeStyle = 'rgba(232,163,61,0.55)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3 * g, 3 * g]);
    ctx.beginPath();
    ctx.moveTo(px, chart.y + padT);
    ctx.lineTo(px, chart.y + chart.h - padB);
    ctx.moveTo(chart.x + padL, py);
    ctx.lineTo(chart.x + chart.w - padR, py);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(px, py, 4.5 * g, 0, Math.PI * 2);
    ctx.fillStyle = C.amber;
    ctx.fill();
    ctx.strokeStyle = C.bgDeep;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  y = chart.y + chart.h + 12 * g;
  text(ctx, t('panel.traj_hint'), r.x, y, T.micro * g, C.textFaint);
  y += 16 * g;
  rule(ctx, r.x, y, r.w);
  y += 12 * g;

  // Probe readouts: distance, height, speed.
  if (probe) {
    text(ctx, t('panel.traj_probe'), r.x, y, T.micro * g, C.amber);
    y += 16 * g;
    const rangeLabel = imperial
      ? `${mToYard(probe.rangeM).toFixed(0)} yd`
      : `${probe.rangeM.toFixed(0)} m`;
    const heightLabel = imperial
      ? `${mToFt(probe.heightM).toFixed(1)} ft`
      : `${probe.heightM.toFixed(2)} m`;
    const speedLabel = `${msToFps(probe.speed).toFixed(0)} fps`;
    const cols: Array<[string, string]> = [
      [t('panel.traj_distance'), rangeLabel],
      [t('panel.traj_height'), heightLabel],
      [t('panel.traj_speed'), speedLabel],
    ];
    const colW = r.w / 3;
    cols.forEach((c, i) => {
      const x = r.x + i * colW;
      text(ctx, c[0], x, y, T.micro * g, C.textFaint);
      text(ctx, c[1], x, y + 14 * g, T.body * g, C.text, 'left', 'bold');
    });
    y += 36 * g;
    ui.field(
      r.x,
      y,
      r.w,
      t('panel.traj_mach_tof'),
      `Mach ${probe.mach.toFixed(2)} · ${probe.t.toFixed(2)} s`,
      probe.mach < 1.2 ? C.red : C.text,
    );
    y += 24 * g;
  }

  rule(ctx, r.x, y, r.w);
  y += 12 * g;

  // Impact summary + nearest plate.
  text(ctx, t('panel.traj_impact'), r.x, y, T.micro * g, C.amber);
  y += 16 * g;
  const impactRangeLabel = imperial
    ? `${mToYard(impactRange).toFixed(0)} yd`
    : `${impactRange.toFixed(0)} m`;
  ui.field(r.x, y, r.w, t('panel.traj_distance'), impactRangeLabel);
  y += 20 * g;
  ui.field(
    r.x,
    y,
    r.w,
    t('panel.traj_impact_speed'),
    `${msToFps(shot.impactSpeed).toFixed(0)} fps · Mach ${shot.impactMach.toFixed(2)}`,
    shot.transonic ? C.red : C.text,
  );
  y += 20 * g;
  ui.field(
    r.x,
    y,
    r.w,
    t('panel.time_of_flight'),
    `${shot.tof.toFixed(2)} s`,
  );
  y += 22 * g;

  if (nearest) {
    const nRange = imperial
      ? `${Math.round(mToYard(nearest.rangeM))} yd`
      : `${Math.round(nearest.rangeM)} m`;
    const nH = targetCentreHeight(nearest) - session.stage.firingHeightM;
    const nHLabel = imperial ? `${mToFt(nH).toFixed(1)} ft` : `${nH.toFixed(2)} m`;
    ui.field(
      r.x,
      y,
      r.w,
      t('panel.traj_nearest'),
      `${t(`shape.${nearest.shape}`)} · ${nRange}`,
      C.amber,
    );
    y += 20 * g;
    ui.field(r.x, y, r.w, t('panel.traj_plate_height'), nHLabel);
    y += 20 * g;
    if (entry.targetId === nearest.id) {
      const miss = imperial
        ? `${(shot.missRight * 39.3701).toFixed(1)}" R, ${(shot.missUp * 39.3701).toFixed(1)}" U`
        : `${(shot.missRight * 100).toFixed(1)} cm R, ${(shot.missUp * 100).toFixed(1)} cm U`;
      ui.field(
        r.x,
        y,
        r.w,
        t('panel.traj_miss'),
        shot.quality !== null ? t('panel.traj_hit') : miss,
        shot.quality !== null ? C.green : C.red,
      );
    }
  }
}

export { inset, measure };
