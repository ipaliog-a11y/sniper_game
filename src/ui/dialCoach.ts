import { t } from '../core/i18n';
import type { Session } from '../core/session';
import { formatDial, interpolateDope } from '../core/scope';
import { clamp, radToMil } from '../core/units';
import type { Settings } from '../core/store';
import { type Rect, fillPanel, paragraph, rule, text } from './gfx';
import { turretPanel, type PanelContext } from './panels';
import type { Ui } from './ui';
import { C, T } from './theme';

/**
 * Guided “how to dial turrets” coach for the First Shots brief.
 * Steps show game-UI mockups (screenshot-style panels) and a few require the
 * shooter to actually dial before NEXT unlocks.
 */

export type DialCoachVisual =
  | 'intro'
  | 'mils'
  | 'card'
  | 'card-row'
  | 'tabs'
  | 'turrets-shot'
  | 'dial-practice'
  | 'wind-zero'
  | 'ready';

export interface DialCoachStep {
  id: string;
  titleKey: string;
  bodyKey: string;
  visual: DialCoachVisual;
  /** Real brief tab to show under the coach (0 brief, 2 card, 3 turrets). */
  focusTab?: number;
  /** Interactive: must dial elevation so “about range” ≈ practice plate. */
  needElevMatch?: boolean;
  /** Interactive: windage clicks must be zero. */
  needWindZero?: boolean;
  verifyHintKey?: string;
}

/**
 * Range used for the practice dial. Must land on a data-card row (card is
 * every 100 m) — 150 m never appears as “about range”, so the old check could
 * never pass. 200 m is on the card and is a real tutorial plate.
 */
export const COACH_PRACTICE_RANGE_M = 200;

export const DIAL_COACH_STEPS: DialCoachStep[] = [
  {
    id: 'intro',
    titleKey: 'coach.step.intro.title',
    bodyKey: 'coach.step.intro.body',
    visual: 'intro',
    focusTab: 0,
  },
  {
    id: 'mils',
    titleKey: 'coach.step.mils.title',
    bodyKey: 'coach.step.mils.body',
    visual: 'mils',
    focusTab: 0,
  },
  {
    id: 'open-card',
    titleKey: 'coach.step.open_card.title',
    bodyKey: 'coach.step.open_card.body',
    visual: 'tabs',
    focusTab: 2,
  },
  {
    id: 'read-card',
    titleKey: 'coach.step.read_card.title',
    bodyKey: 'coach.step.read_card.body',
    visual: 'card',
    focusTab: 2,
  },
  {
    id: 'pick-row',
    titleKey: 'coach.step.pick_row.title',
    bodyKey: 'coach.step.pick_row.body',
    visual: 'card-row',
    focusTab: 2,
  },
  {
    id: 'open-turrets',
    titleKey: 'coach.step.open_turrets.title',
    bodyKey: 'coach.step.open_turrets.body',
    visual: 'tabs',
    focusTab: 3,
  },
  {
    id: 'turret-layout',
    titleKey: 'coach.step.turret_layout.title',
    bodyKey: 'coach.step.turret_layout.body',
    visual: 'turrets-shot',
    focusTab: 3,
  },
  {
    id: 'dial-elev',
    titleKey: 'coach.step.dial_elev.title',
    bodyKey: 'coach.step.dial_elev.body',
    visual: 'dial-practice',
    focusTab: 3,
    needElevMatch: true,
    verifyHintKey: 'coach.verify.elev',
  },
  {
    id: 'wind-zero',
    titleKey: 'coach.step.wind_zero.title',
    bodyKey: 'coach.step.wind_zero.body',
    visual: 'wind-zero',
    focusTab: 3,
    needWindZero: true,
    verifyHintKey: 'coach.verify.wind',
  },
  {
    id: 'ready',
    titleKey: 'coach.step.ready.title',
    bodyKey: 'coach.step.ready.body',
    visual: 'ready',
    focusTab: 0,
  },
];

export interface DialCoachState {
  step: number;
  /** True after finishing the last step. */
  complete: boolean;
}

export function createDialCoach(): DialCoachState {
  return { step: 0, complete: false };
}

export function coachStep(state: DialCoachState): DialCoachStep {
  return DIAL_COACH_STEPS[clamp(state.step, 0, DIAL_COACH_STEPS.length - 1)];
}

/** Closest dope row range for current elevation dial, metres (same as turret panel). */
export function aboutRangeM(session: Session): number {
  const optic = session.loadout.optic;
  const dialledMil = radToMil(session.scope.elevationClicks * optic.clickRad);
  const rows = session.dope.rows;
  if (!rows.length) return 0;
  let best = rows[0];
  for (const row of rows) {
    if (Math.abs(row.elevationMil - dialledMil) < Math.abs(best.elevationMil - dialledMil)) {
      best = row;
    }
  }
  return best.rangeM;
}

export function dialledElevMil(session: Session): number {
  return radToMil(session.scope.elevationClicks * session.loadout.optic.clickRad);
}

/** Card elevation for the practice range (interpolated if needed). */
export function practiceElevMil(session: Session, targetM = COACH_PRACTICE_RANGE_M): number {
  const row = interpolateDope(session.dope, targetM);
  return row?.elevationMil ?? 0;
}

/**
 * Pass when the turret panel’s “about range” is the practice card row, or when
 * dialled mils are within ~one click of the card elev for that range.
 */
export function elevMatchOk(session: Session, targetM = COACH_PRACTICE_RANGE_M): boolean {
  if (aboutRangeM(session) === targetM) return true;
  const optic = session.loadout.optic;
  const clickMil = Math.abs(radToMil(optic.clickRad));
  const need = practiceElevMil(session, targetM);
  const have = dialledElevMil(session);
  // Allow one full click of error (MOA glass is coarser than 0.1 mil).
  return Math.abs(have - need) <= Math.max(0.12, clickMil * 1.05);
}

export function windZeroOk(session: Session): boolean {
  return session.scope.windageClicks === 0;
}

export function stepVerified(session: Session, step: DialCoachStep): boolean {
  if (step.needElevMatch) return elevMatchOk(session);
  if (step.needWindZero) return windZeroOk(session);
  return true;
}

function distLabel(m: number, imperial: boolean): string {
  return imperial ? `${Math.round(m * 1.09361)} yd` : `${Math.round(m)} m`;
}

// --- screenshot-style mockups ---------------------------------------------

/** Fake “device frame” so mockups read as in-game screenshots. */
function shotFrame(ctx: CanvasRenderingContext2D, r: Rect, caption: string, g: number): Rect {
  fillPanel(ctx, r, 10, C.bgDeep, C.edge);
  // Title bar like the brief header strip.
  ctx.fillStyle = C.panel;
  ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, 22 * g);
  text(ctx, caption, r.x + 10 * g, r.y + 12 * g, T.micro * g, C.amber, 'left', 'bold');
  text(ctx, 'COLD BORE', r.x + r.w - 10 * g, r.y + 12 * g, T.micro * g, C.textFaint, 'right');
  return {
    x: r.x + 8 * g,
    y: r.y + 28 * g,
    w: r.w - 16 * g,
    h: r.h - 36 * g,
  };
}

function drawMilsDiagram(ctx: CanvasRenderingContext2D, r: Rect, g: number): void {
  const inner = shotFrame(ctx, r, t('coach.shot.mils'), g);
  const cy = inner.y + inner.h * 0.42;
  const left = inner.x + 16 * g;
  const right = inner.x + inner.w - 16 * g;
  // Ground line.
  ctx.strokeStyle = C.edge;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(left, cy + 28 * g);
  ctx.lineTo(right, cy + 28 * g);
  ctx.stroke();
  // 100 m “range” bar.
  ctx.strokeStyle = C.blue;
  ctx.setLineDash([4 * g, 4 * g]);
  ctx.beginPath();
  ctx.moveTo(left, cy + 28 * g);
  ctx.lineTo(right, cy + 28 * g);
  ctx.stroke();
  ctx.setLineDash([]);
  // Vertical 1 mil height at “100 m” ≈ 10 cm visual metaphor.
  const milH = 36 * g;
  const mx = left + (right - left) * 0.72;
  ctx.strokeStyle = C.amber;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(mx, cy + 28 * g - milH);
  ctx.lineTo(mx, cy + 28 * g);
  ctx.stroke();
  // End caps.
  ctx.beginPath();
  ctx.moveTo(mx - 6 * g, cy + 28 * g - milH);
  ctx.lineTo(mx + 6 * g, cy + 28 * g - milH);
  ctx.moveTo(mx - 6 * g, cy + 28 * g);
  ctx.lineTo(mx + 6 * g, cy + 28 * g);
  ctx.stroke();
  text(ctx, '1 MIL', mx + 10 * g, cy + 28 * g - milH / 2, T.small * g, C.amber, 'left', 'bold');
  text(ctx, '≈ 10 cm @ 100 m', mx + 10 * g, cy + 28 * g - milH / 2 + 14 * g, T.micro * g, C.textDim);
  text(ctx, '100 m', (left + right) / 2, cy + 44 * g, T.micro * g, C.textFaint, 'center');
  // Scope circle hint.
  ctx.strokeStyle = C.edgeSoft;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(left + 40 * g, cy - 4 * g, 32 * g, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = C.reticle;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left + 40 * g - 28 * g, cy - 4 * g);
  ctx.lineTo(left + 40 * g + 28 * g, cy - 4 * g);
  ctx.moveTo(left + 40 * g, cy - 4 * g - 28 * g);
  ctx.lineTo(left + 40 * g, cy - 4 * g + 28 * g);
  ctx.stroke();
  text(ctx, t('coach.shot.reticle'), left + 40 * g, cy + 40 * g, T.micro * g, C.textFaint, 'center');
}

function drawCardShot(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  session: Session,
  settings: Settings,
  g: number,
  highlightM: number | null,
): void {
  const inner = shotFrame(ctx, r, t('coach.shot.card'), g);
  const rows = session.dope.rows.filter((row) => row.rangeM >= 100 && row.rangeM <= 400);
  const show = rows.length ? rows : session.dope.rows.slice(0, 8);
  let y = inner.y + 6 * g;
  text(ctx, t('panel.data_card'), inner.x, y, T.small * g, C.amber);
  y += 14 * g;
  const cols = [0, 0.32, 0.55, 0.78];
  const headers = [t('panel.range'), t('panel.elev'), t('panel.wind'), t('panel.tof')];
  headers.forEach((h, i) => {
    text(ctx, h, inner.x + inner.w * cols[i], y, T.micro * g, C.textFaint, i === 0 ? 'left' : 'right');
  });
  y += 10 * g;
  rule(ctx, inner.x, y, inner.w);
  y += 6 * g;
  const rowH = 18 * g;
  for (const row of show.slice(0, 10)) {
    const near =
      highlightM != null
        ? Math.abs(row.rangeM - highlightM) < 1
        : row.rangeM === 100 || row.rangeM === 150 || row.rangeM === 200;
    if (near) {
      ctx.fillStyle = 'rgba(232,163,61,0.12)';
      ctx.fillRect(inner.x, y - rowH / 2 + 2 * g, inner.w, rowH);
    }
    const colour = near ? C.text : C.textDim;
    text(ctx, distLabel(row.rangeM, settings.imperial), inner.x, y + 2 * g, T.small * g, colour);
    text(
      ctx,
      row.elevationMil.toFixed(1),
      inner.x + inner.w * cols[1],
      y + 2 * g,
      T.small * g,
      near ? C.amber : colour,
      'right',
    );
    text(
      ctx,
      row.wind10Mil.toFixed(1),
      inner.x + inner.w * cols[2],
      y + 2 * g,
      T.small * g,
      colour,
      'right',
    );
    text(
      ctx,
      `${row.tof.toFixed(2)}s`,
      inner.x + inner.w * cols[3],
      y + 2 * g,
      T.small * g,
      colour,
      'right',
    );
    y += rowH;
    if (y > inner.y + inner.h - 8 * g) break;
  }
}

function drawTabsShot(ctx: CanvasRenderingContext2D, r: Rect, active: number, g: number): void {
  const inner = shotFrame(ctx, r, t('coach.shot.tabs'), g);
  const labels = [
    t('brief.tab.brief'),
    t('brief.tab.weather'),
    t('brief.tab.card'),
    t('brief.tab.turrets'),
  ];
  const tw = (inner.w - 6 * g) / labels.length;
  labels.forEach((lab, i) => {
    const tr: Rect = {
      x: inner.x + i * tw + 2 * g,
      y: inner.y + 8 * g,
      w: tw - 4 * g,
      h: 28 * g,
    };
    const on = i === active;
    fillPanel(ctx, tr, 6, on ? 'rgba(232,163,61,0.18)' : C.panel, on ? C.amber : C.edge);
    text(ctx, lab, tr.x + tr.w / 2, tr.y + tr.h / 2, T.micro * g, on ? C.amber : C.textDim, 'center', on ? 'bold' : 'normal');
  });
  // Fake body content under tabs.
  const body: Rect = {
    x: inner.x,
    y: inner.y + 48 * g,
    w: inner.w,
    h: inner.h - 56 * g,
  };
  fillPanel(ctx, body, 6, C.panel, C.edgeSoft);
  if (active === 2) {
    text(ctx, t('panel.data_card'), body.x + 12 * g, body.y + 16 * g, T.small * g, C.amber);
    text(ctx, t('coach.shot.card_preview'), body.x + 12 * g, body.y + 36 * g, T.micro * g, C.textDim);
  } else if (active === 3) {
    text(ctx, t('panel.turrets'), body.x + 12 * g, body.y + 16 * g, T.small * g, C.amber);
    text(ctx, '0.0 MIL', body.x + 12 * g, body.y + 40 * g, T.head * g, C.text, 'left', 'bold');
    text(ctx, t('coach.shot.turret_preview'), body.x + 12 * g, body.y + 62 * g, T.micro * g, C.textDim);
  } else {
    text(ctx, t('coach.shot.brief_preview'), body.x + 12 * g, body.y + 20 * g, T.micro * g, C.textDim);
  }
}

function drawTurretsShot(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  session: Session,
  g: number,
  highlightElev: boolean,
): void {
  const inner = shotFrame(ctx, r, t('coach.shot.turrets'), g);
  const optic = session.loadout.optic;
  let y = inner.y + 8 * g;
  text(ctx, t('panel.turrets'), inner.x, y, T.small * g, C.amber);
  y += 18 * g;
  rule(ctx, inner.x, y, inner.w);
  y += 14 * g;

  // Elevation row mock.
  if (highlightElev) {
    ctx.fillStyle = 'rgba(232,163,61,0.10)';
    ctx.fillRect(inner.x, y - 4 * g, inner.w, 52 * g);
  }
  text(ctx, t('panel.elevation_travel', { mils: optic.elevationTravelMils }), inner.x, y, T.micro * g, C.textFaint);
  y += 14 * g;
  text(ctx, formatDial(optic, session.scope.elevationClicks), inner.x, y, T.head * g, C.text, 'left', 'bold');
  // Fake buttons.
  const glyphs = ['−−', '−', '0', '+', '++'];
  const btn = 28 * g;
  const gap = 4 * g;
  const total = glyphs.length * btn + (glyphs.length - 1) * gap;
  let bx = inner.x + inner.w - total;
  glyphs.forEach((gl, i) => {
    const rect: Rect = { x: bx, y: y - 8 * g, w: btn, h: btn };
    fillPanel(ctx, rect, 5, i === 3 && highlightElev ? 'rgba(232,163,61,0.25)' : C.panel, C.edge);
    text(ctx, gl, rect.x + rect.w / 2, rect.y + rect.h / 2, T.small * g, C.text, 'center', 'bold');
    bx += btn + gap;
  });
  y += 36 * g;
  text(ctx, t('panel.windage'), inner.x, y, T.micro * g, C.textFaint);
  y += 14 * g;
  text(ctx, formatDial(optic, session.scope.windageClicks), inner.x, y, T.head * g, C.textDim, 'left', 'bold');
  y += 28 * g;
  const about = aboutRangeM(session);
  text(
    ctx,
    t('panel.about_range', {
      range: distLabel(about, false),
    }),
    inner.x,
    y,
    T.small * g,
    C.textDim,
  );
}

function drawReadyShot(ctx: CanvasRenderingContext2D, r: Rect, g: number): void {
  const inner = shotFrame(ctx, r, t('coach.shot.ready'), g);
  // Fake scope circle.
  const cx = inner.x + inner.w * 0.35;
  const cy = inner.y + inner.h * 0.48;
  const rad = Math.min(inner.w, inner.h) * 0.32;
  ctx.fillStyle = '#1a2420';
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = C.edge;
  ctx.lineWidth = 3;
  ctx.stroke();
  // Steel plate.
  ctx.fillStyle = '#3a403c';
  ctx.beginPath();
  ctx.ellipse(cx, cy + rad * 0.08, rad * 0.22, rad * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = C.steel;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Crosshair.
  ctx.strokeStyle = C.reticle;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - rad * 0.7, cy);
  ctx.lineTo(cx + rad * 0.7, cy);
  ctx.moveTo(cx, cy - rad * 0.7);
  ctx.lineTo(cx, cy + rad * 0.7);
  ctx.stroke();
  // HUD strip.
  text(ctx, t('shoot.elev'), inner.x + inner.w * 0.62, inner.y + 20 * g, T.micro * g, C.textFaint);
  text(ctx, '≈ 200 m', inner.x + inner.w * 0.62, inner.y + 36 * g, T.body * g, C.amber, 'left', 'bold');
  text(ctx, t('coach.shot.hold_fire'), inner.x + inner.w * 0.62, inner.y + 60 * g, T.micro * g, C.textDim);
  fillPanel(
    ctx,
    { x: inner.x + inner.w * 0.62, y: inner.y + inner.h - 48 * g, w: inner.w * 0.32, h: 32 * g },
    6,
    'rgba(232,163,61,0.2)',
    C.amber,
  );
  text(
    ctx,
    t('brief.go_hot'),
    inner.x + inner.w * 0.78,
    inner.y + inner.h - 32 * g,
    T.small * g,
    C.amber,
    'center',
    'bold',
  );
}

function drawIntroShot(ctx: CanvasRenderingContext2D, r: Rect, g: number): void {
  const inner = shotFrame(ctx, r, t('coach.shot.intro'), g);
  // Three plate markers at known distances.
  const plates = [
    { m: 100, x: 0.25 },
    { m: 150, x: 0.5 },
    { m: 200, x: 0.75 },
  ];
  plates.forEach((p, i) => {
    const px = inner.x + inner.w * p.x;
    const py = inner.y + inner.h * (0.35 + i * 0.08);
    const s = 18 * g * (1 - i * 0.15);
    ctx.fillStyle = '#404844';
    ctx.beginPath();
    ctx.ellipse(px, py, s, s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.steel;
    ctx.stroke();
    text(ctx, `${p.m} m`, px, py + s + 12 * g, T.micro * g, C.amber, 'center');
  });
  text(ctx, t('stage.tutorial.name'), inner.x + 12 * g, inner.y + 14 * g, T.small * g, C.textDim);
}

/**
 * Draw the right-hand visual for the current step (screenshot-style mock).
 */
export function drawCoachVisual(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  step: DialCoachStep,
  session: Session,
  settings: Settings,
  g: number,
): void {
  switch (step.visual) {
    case 'intro':
      drawIntroShot(ctx, r, g);
      break;
    case 'mils':
      drawMilsDiagram(ctx, r, g);
      break;
    case 'card':
      drawCardShot(ctx, r, session, settings, g, null);
      break;
    case 'card-row':
      drawCardShot(ctx, r, session, settings, g, COACH_PRACTICE_RANGE_M);
      break;
    case 'tabs':
      drawTabsShot(ctx, r, step.focusTab === 3 ? 3 : step.focusTab === 2 ? 2 : 0, g);
      break;
    case 'turrets-shot':
      drawTurretsShot(ctx, r, session, g, true);
      break;
    case 'dial-practice':
    case 'wind-zero':
      // Live controls drawn by the caller below the visual; still show a frame hint.
      drawTurretsShot(ctx, r, session, g, step.visual === 'dial-practice');
      break;
    case 'ready':
      drawReadyShot(ctx, r, g);
      break;
  }
}

export interface DialCoachDrawResult {
  /** True if the user advanced or closed. */
  closed: boolean;
  advanced: boolean;
  /** Tab the brief should show under the coach. */
  focusTab: number;
}

/**
 * Full-screen guided coach overlay. Returns whether step advanced / closed.
 */
export function drawDialCoach(
  ctx: CanvasRenderingContext2D,
  area: Rect,
  ui: Ui,
  session: Session,
  settings: Settings,
  panelCtx: PanelContext,
  state: DialCoachState,
  g: number,
  onClick: () => void,
): DialCoachDrawResult {
  const step = coachStep(state);
  const verified = stepVerified(session, step);
  const result: DialCoachDrawResult = {
    closed: false,
    advanced: false,
    focusTab: step.focusTab ?? 0,
  };

  // Dim the world behind.
  ctx.fillStyle = 'rgba(8,11,10,0.82)';
  ctx.fillRect(area.x, area.y, area.w, area.h);

  const pad = 12 * g;
  const panel: Rect = {
    x: area.x + pad,
    y: area.y + pad,
    w: area.w - pad * 2,
    h: area.h - pad * 2,
  };
  fillPanel(ctx, panel, 12, C.panel, C.amber);

  // Header.
  const stepN = state.step + 1;
  const stepTotal = DIAL_COACH_STEPS.length;
  text(
    ctx,
    t('coach.header', { n: stepN, total: stepTotal }),
    panel.x + 16 * g,
    panel.y + 16 * g,
    T.micro * g,
    C.amber,
    'left',
    'bold',
  );
  text(
    ctx,
    t(step.titleKey),
    panel.x + 16 * g,
    panel.y + 34 * g,
    T.head * g,
    C.text,
    'left',
    'bold',
  );

  // Progress pips.
  const pipY = panel.y + 48 * g;
  const pipW = Math.min(14 * g, (panel.w - 32 * g) / stepTotal - 2 * g);
  for (let i = 0; i < stepTotal; i++) {
    const px = panel.x + 16 * g + i * (pipW + 3 * g);
    fillPanel(
      ctx,
      { x: px, y: pipY, w: pipW, h: 4 * g },
      2,
      i < state.step ? C.amber : i === state.step ? C.green : C.edgeSoft,
      'transparent',
    );
  }

  const contentTop = panel.y + 62 * g;
  const footerH = 52 * g;
  const contentH = panel.h - (contentTop - panel.y) - footerH - 8 * g;
  const wide = panel.w > 560 * g;
  const textW = wide ? panel.w * 0.42 - 24 * g : panel.w - 32 * g;
  const bodyH = paragraph(
    ctx,
    t(step.bodyKey),
    panel.x + 16 * g,
    contentTop,
    textW,
    T.small * g,
    C.textDim,
  );

  // Visual / interactive region.
  const visualTop = wide ? contentTop : contentTop + bodyH + 12 * g;
  const visual: Rect = wide
    ? {
        x: panel.x + panel.w * 0.44,
        y: contentTop,
        w: panel.w * 0.54 - 16 * g,
        h: contentH,
      }
    : {
        x: panel.x + 16 * g,
        y: visualTop,
        w: panel.w - 32 * g,
        h: Math.max(120 * g, contentH - bodyH - 16 * g),
      };

  const interactive = step.visual === 'dial-practice' || step.visual === 'wind-zero';
  if (interactive) {
    // Split: small screenshot + live turret panel for verification.
    const shotH = Math.min(visual.h * 0.38, 130 * g);
    drawCoachVisual(
      ctx,
      { x: visual.x, y: visual.y, w: visual.w, h: shotH },
      step,
      session,
      settings,
      g,
    );
    const live: Rect = {
      x: visual.x,
      y: visual.y + shotH + 8 * g,
      w: visual.w,
      h: visual.h - shotH - 8 * g,
    };
    fillPanel(ctx, live, 8, C.bgDeep, C.edge);
    const liveInner: Rect = {
      x: live.x + 8 * g,
      y: live.y + 8 * g,
      w: live.w - 16 * g,
      h: live.h - 16 * g,
    };
    turretPanel(ctx, liveInner, panelCtx, onClick);

    // Live verify strip.
    const about = aboutRangeM(session);
    const ok = verified;
    const statusY = panel.y + panel.h - footerH - 18 * g;
    const elevNeed = practiceElevMil(session).toFixed(1);
    const elevHave = dialledElevMil(session).toFixed(1);
    text(
      ctx,
      ok
        ? t('coach.verify.ok')
        : t(step.verifyHintKey ?? 'coach.verify.elev', {
            range: distLabel(COACH_PRACTICE_RANGE_M, settings.imperial),
            about: distLabel(about, settings.imperial),
            elev: elevNeed,
            dial: elevHave,
          }),
      panel.x + 16 * g,
      statusY,
      T.small * g,
      ok ? C.green : C.amber,
    );
  } else {
    drawCoachVisual(ctx, visual, step, session, settings, g);
  }

  // Footer buttons.
  const btnH = 36 * g;
  const btnY = panel.y + panel.h - btnH - 10 * g;
  const close: Rect = { x: panel.x + 12 * g, y: btnY, w: 88 * g, h: btnH };
  const back: Rect = { x: panel.x + 108 * g, y: btnY, w: 88 * g, h: btnH };
  const nextW = 140 * g;
  const next: Rect = {
    x: panel.x + panel.w - nextW - 12 * g,
    y: btnY,
    w: nextW,
    h: btnH,
  };

  if (ui.button(close, t('coach.close'), { size: T.small * g })) {
    result.closed = true;
    return result;
  }
  if (state.step > 0) {
    if (ui.button(back, t('coach.back'), { size: T.small * g })) {
      state.step -= 1;
      result.advanced = true;
      onClick();
      return result;
    }
  }

  const last = state.step >= DIAL_COACH_STEPS.length - 1;
  const nextLabel = last ? t('coach.finish') : t('coach.next');
  if (ui.button(next, nextLabel, { accent: true, size: T.small * g, disabled: !verified })) {
    if (!verified) return result;
    if (last) {
      state.complete = true;
      result.closed = true;
      result.advanced = true;
    } else {
      state.step += 1;
      result.advanced = true;
    }
    onClick();
  }

  if (!verified) {
    text(
      ctx,
      t('coach.next_locked'),
      next.x + next.w / 2,
      next.y - 10 * g,
      T.micro * g,
      C.textFaint,
      'center',
    );
  }

  return result;
}
