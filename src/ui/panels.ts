import { densityAltitude } from '../core/atmosphere';
import { t } from '../core/i18n';
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
      t('panel.elevation'),
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
  text(ctx, `${optic.name} · ${step}${unit}/click`, r.x + r.w, y, T.micro * g, C.textFaint, 'right');
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

    const bx = r.x + r.w - btn * 4 - 18 * g;
    const buttons: Array<[string, number]> = [
      ['−−', -10],
      ['−', -1],
      ['+', 1],
      ['++', 10],
    ];
    buttons.forEach(([glyph, delta], i) => {
      const rect: Rect = { x: bx + i * (btn + 6 * g), y: y + 4 * g, w: btn, h: btn };
      const next = clamp(clicks + delta, minClicks, maxClicks);
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
  const nextPar = ui.slider('par', parSlider, session.scope.parallaxM, 50, 2000);
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

export { inset, measure };
