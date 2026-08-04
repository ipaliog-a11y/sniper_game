import { catalogName } from '../core/catalogLabels';
import { t } from '../core/i18n';
import { claimedMuzzleVelocityFps } from '../core/loadout';
import type { Stage } from '../core/range';
import { type Session, createSession } from '../core/session';
import { msToFps, mToYard } from '../core/units';
import { type App, type Scene } from '../ui/app';
import { audio } from '../ui/audio';
import { type Rect, fillPanel, paragraph, rule, text } from '../ui/gfx';
import { dopePanel, turretPanel, weatherPanel } from '../ui/panels';
import { C, Scroll, T } from '../ui/ui';
import { ShootScene } from './ShootScene';
import { StageSelectScene } from './StageSelectScene';

/**
 * Everything you are allowed to do before the clock starts. Read the weather,
 * study the card, set the turrets. Once you go hot the clock runs whether you
 * are ready or not, so this screen is where stages are actually won.
 */

const TAB_KEYS = [
  'brief.tab.brief',
  'brief.tab.weather',
  'brief.tab.card',
  'brief.tab.turrets',
] as const;

export class BriefScene implements Scene {
  readonly name = 'brief';
  private readonly stage: Stage;
  /** Built on entry, which is always before the first update or render. */
  private session!: Session;
  private tab = 0;
  private dopeScroll = new Scroll('briefdope');
  private time = 0;

  constructor(stage: Stage) {
    this.stage = stage;
  }

  enter(app: App): void {
    this.session = createSession(this.stage, app.profile.loadout, app.profile.settings.assist);
    audio.unlock();
  }

  update(dt: number): void {
    // The wind keeps blowing while you read about it.
    this.time += dt;
    audio.setWind(this.session.conditions.zones[0]?.baseSpeed ?? 0);
  }

  render(ctx: CanvasRenderingContext2D, app: App): void {
    const { ui } = app;
    const g = app.gauge;
    const safe = app.safe;
    const session = this.session;

    ui.fitText(
      t(`stage.${this.stage.id}.name`),
      safe.x,
      safe.y + 12 * g,
      safe.w - 160 * g,
      T.head * g,
      C.text,
      'left',
      'bold',
    );
    const back: Rect = { x: safe.x + safe.w - 78 * g, y: safe.y, w: 78 * g, h: 30 * g };
    if (ui.button(back, t('common.back'), { size: T.small * g })) {
      audio.tap();
      audio.stopWind();
      app.set(new StageSelectScene());
    }

    const tabs = TAB_KEYS.map((k) => t(k));
    const tabRect: Rect = { x: safe.x, y: safe.y + 38 * g, w: safe.w, h: 30 * g };
    const picked = ui.tabs(tabRect, tabs, this.tab);
    if (picked >= 0) {
      this.tab = picked;
      audio.tap();
    }

    const goH = 52 * g;
    const body: Rect = {
      x: safe.x,
      y: tabRect.y + tabRect.h + 12 * g,
      w: safe.w,
      h: safe.h - (tabRect.y + tabRect.h + 12 * g - safe.y) - goH - 12 * g,
    };

    const panelCtx = {
      ui,
      session,
      settings: app.profile.settings,
      time: this.time,
      gauge: g,
    };

    switch (this.tab) {
      case 0:
        this.drawBrief(ctx, body, app);
        break;
      case 1:
        weatherPanel(ctx, body, panelCtx);
        break;
      case 2:
        dopePanel(ctx, body, panelCtx, this.dopeScroll);
        break;
      case 3:
        turretPanel(ctx, body, panelCtx, () => audio.click());
        break;
    }

    const go: Rect = { x: safe.x, y: safe.y + safe.h - goH, w: safe.w, h: goH - 4 * g };
    if (ui.button(go, t('brief.go_hot'), { accent: true, size: T.head * g })) {
      audio.unlock();
      audio.bolt();
      app.set(new ShootScene(session));
    }
  }

  /**
   * The brief. Two columns when there is width for them, because on a laptop a
   * single stack of fields runs off the bottom of the screen and the GO HOT
   * button is the one thing that must never be buried.
   */
  private drawBrief(ctx: CanvasRenderingContext2D, r: Rect, app: App): void {
    const g = app.gauge;
    const { ui } = app;
    const session = this.session;
    const imperial = app.profile.settings.imperial;
    const loadout = session.loadout;
    const tutorial = this.stage.id === 'tutorial';

    const twoUp = r.w > 520 * g && !tutorial;
    const colW = twoUp ? r.w / 2 - 14 * g : r.w;
    const rightX = twoUp ? r.x + r.w / 2 + 14 * g : r.x;

    let left = r.y + 12 * g;

    // Tutorial: put the mil-dial coach first so new shooters see it before kit stats.
    if (tutorial) {
      const pad = 12 * g;
      const maxTextW = r.w - pad * 2;
      const body = t('brief.tutorial_dial_body');
      const steps = t('brief.tutorial_dial_steps');
      // Rough wrap estimates so the panel can be filled before text is drawn.
      const charW = T.small * g * 0.48;
      const bodyLines = Math.max(4, Math.ceil(body.length / Math.max(20, maxTextW / charW)));
      const stepLines = Math.max(2, Math.ceil(steps.length / Math.max(24, maxTextW / (T.micro * g * 0.48))));
      const bodyH = bodyLines * T.small * g * 1.45;
      const stepsH = stepLines * T.micro * g * 1.45;
      const coachH = 30 * g + bodyH + 10 * g + stepsH + 12 * g;
      fillPanel(ctx, { x: r.x, y: left, w: r.w, h: coachH }, 8, 'rgba(232,163,61,0.08)', C.amber);
      text(ctx, t('brief.tutorial_dial_title'), r.x + pad, left + 14 * g, T.small * g, C.amber, 'left', 'bold');
      const drawnBody = paragraph(ctx, body, r.x + pad, left + 28 * g, maxTextW, T.small * g, C.text);
      paragraph(ctx, steps, r.x + pad, left + 28 * g + drawnBody + 8 * g, maxTextW, T.micro * g, C.textDim);
      left += coachH + 12 * g;
    }

    const briefHeight = paragraph(
      ctx,
      t(`stage.${this.stage.id}.brief`),
      r.x,
      left,
      colW,
      T.small * g,
      C.textDim,
    );
    left += briefHeight + 14 * g;
    rule(ctx, r.x, left, colW);
    left += 16 * g;

    text(ctx, t('brief.on_the_rifle'), r.x, left, T.small * g, C.amber);
    left += 20 * g;
    const hasChrono = loadout.hasGear('chrono');
    const trueFps = msToFps(loadout.muzzleVelocity).toFixed(0);
    const boxFps = claimedMuzzleVelocityFps(loadout).toFixed(0);
    const rifleRows: Array<[string, string, string?]> = [
      [
        catalogName(loadout.rifle.id, loadout.rifle.name).toUpperCase(),
        hasChrono
          ? t('brief.fps_chrono', { fps: trueFps })
          : t('brief.fps_claimed', { fps: boxFps }),
        hasChrono ? C.green : C.amber,
      ],
      [
        catalogName(loadout.cartridge.id, loadout.cartridge.name).toUpperCase(),
        t('brief.moa_cone', { moa: loadout.dispersionMoa.toFixed(2) }),
      ],
      [
        catalogName(loadout.optic.id, loadout.optic.name).toUpperCase(),
        t('brief.mil_travel', { mils: loadout.optic.elevationTravelMils }),
      ],
      [
        t('brief.gear'),
        loadout.gear.length
          ? loadout.gear.map((x) => catalogName(x.id, x.name)).join(' · ')
          : t('brief.nothing_fitted'),
        loadout.gear.length ? C.text : C.textFaint,
      ],
      [
        t('brief.zero'),
        imperial
          ? `${Math.round(mToYard(loadout.zeroRangeM))} yd`
          : `${loadout.zeroRangeM} m`,
      ],
    ];
    for (const [label, value, colour] of rifleRows) {
      ui.field(r.x, left, colW, label, value, colour ?? C.text);
      left += 19 * g;
    }

    // Second column, or straight on underneath if the screen is narrow.
    let right = twoUp ? r.y + 12 * g : left + 16 * g;
    if (!twoUp) {
      rule(ctx, r.x, right - 8 * g, colW);
    }

    text(ctx, t('brief.the_course'), rightX, right, T.small * g, C.amber);
    right += 20 * g;
    const courseRows: Array<[string, string, string?]> = [
      [t('brief.targets'), `${this.stage.targets.length}`],
      [t('brief.rounds'), `${this.stage.rounds}`],
      [t('brief.time_limit'), `${Math.round(this.stage.timeLimitS)} s`],
      [t('brief.par'), `${Math.round(this.stage.parPerTargetS)} s`],
      [
        t('brief.ranging'),
        loadout.hasGear('lrf') ? t('brief.ranging_lrf') : t('brief.ranging_mil'),
        loadout.hasGear('lrf') ? C.green : C.amber,
      ],
      [
        t('brief.solution'),
        loadout.hasGear('solver') ? t('brief.solution_yes') : t('brief.solution_no'),
        loadout.hasGear('solver') ? C.green : C.amber,
      ],
      [
        t('brief.weather'),
        loadout.hasGear('kestrel') ? t('brief.weather_yes') : t('brief.weather_no'),
        loadout.hasGear('kestrel') ? C.green : C.amber,
      ],
      [
        t('brief.chrono'),
        loadout.hasGear('chrono') ? t('brief.chrono_yes') : t('brief.chrono_no'),
        loadout.hasGear('chrono') ? C.green : C.amber,
      ],
    ];
    for (const [label, value, colour] of courseRows) {
      ui.field(rightX, right, colW, label, value, colour ?? C.text);
      right += 19 * g;
    }

    // A quiet warning if the load simply will not reach.
    const furthest = this.stage.targets.reduce((m, tgt) => Math.max(m, tgt.rangeM), 0);
    const transonic = session.dope.transonicRangeM;
    if (transonic && furthest > transonic) {
      const warnY = Math.min(r.y + r.h - 48 * g, Math.max(left, right) + 12 * g);
      const warn: Rect = { x: rightX, y: warnY, w: colW, h: 44 * g };
      fillPanel(ctx, warn, 6, 'rgba(224,112,95,0.10)', C.red);
      const rangeStr = imperial
        ? `${Math.round(mToYard(transonic))} yd`
        : `${Math.round(transonic)} m`;
      paragraph(
        ctx,
        t('brief.transonic_warn', { range: rangeStr }),
        warn.x + 10 * g,
        warn.y + 13 * g,
        warn.w - 20 * g,
        T.micro * g,
        C.red,
      );
    }
  }
}
