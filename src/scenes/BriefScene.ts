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

const TABS = ['BRIEF', 'WEATHER', 'DATA CARD', 'TURRETS'];

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
    this.session = createSession(this.stage, app.profile.loadout);
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

    ui.fitText(this.stage.name, safe.x, safe.y + 12 * g, safe.w - 160 * g, T.head * g, C.text, 'left', 'bold');
    const back: Rect = { x: safe.x + safe.w - 78 * g, y: safe.y, w: 78 * g, h: 30 * g };
    if (ui.button(back, 'BACK', { size: T.small * g })) {
      audio.tap();
      audio.stopWind();
      app.set(new StageSelectScene());
    }

    const tabRect: Rect = { x: safe.x, y: safe.y + 38 * g, w: safe.w, h: 30 * g };
    const picked = ui.tabs(tabRect, TABS, this.tab);
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
    if (ui.button(go, 'GO HOT', { accent: true, size: T.head * g })) {
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

    const twoUp = r.w > 520 * g;
    const colW = twoUp ? r.w / 2 - 14 * g : r.w;
    const rightX = twoUp ? r.x + r.w / 2 + 14 * g : r.x;

    const briefHeight = paragraph(ctx, this.stage.brief, r.x, r.y + 12 * g, colW, T.small * g, C.textDim);
    let left = r.y + 12 * g + briefHeight + 14 * g;
    rule(ctx, r.x, left, colW);
    left += 16 * g;

    text(ctx, 'ON THE RIFLE', r.x, left, T.small * g, C.amber);
    left += 20 * g;
    const rifleRows: Array<[string, string, string?]> = [
      [loadout.rifle.name.toUpperCase(), `${msToFps(loadout.muzzleVelocity).toFixed(0)} fps today`],
      [loadout.cartridge.name.toUpperCase(), `${loadout.dispersionMoa.toFixed(2)} MOA cone`],
      [loadout.optic.name.toUpperCase(), `${loadout.optic.elevationTravelMils} MIL travel`],
      [
        'GEAR',
        loadout.gear.length ? loadout.gear.map((x) => x.name).join(' · ') : 'nothing fitted',
        loadout.gear.length ? C.text : C.textFaint,
      ],
      ['ZERO', imperial ? `${Math.round(mToYard(loadout.zeroRangeM))} yd` : `${loadout.zeroRangeM} m`],
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

    text(ctx, 'THE COURSE', rightX, right, T.small * g, C.amber);
    right += 20 * g;
    const courseRows: Array<[string, string, string?]> = [
      ['TARGETS', `${this.stage.targets.length}`],
      ['ROUNDS', `${this.stage.rounds}`],
      ['TIME LIMIT', `${Math.round(this.stage.timeLimitS)} s`],
      ['PAR PER TARGET', `${Math.round(this.stage.parPerTargetS)} s`],
      [
        'RANGING',
        loadout.hasGear('lrf') ? 'rangefinder fitted' : 'mil the targets yourself',
        loadout.hasGear('lrf') ? C.green : C.amber,
      ],
      [
        'SOLUTION',
        loadout.hasGear('solver') ? 'solver fitted' : 'read it off the card',
        loadout.hasGear('solver') ? C.green : C.amber,
      ],
      [
        'WEATHER',
        loadout.hasGear('kestrel') ? 'meter fitted' : 'estimate it',
        loadout.hasGear('kestrel') ? C.green : C.amber,
      ],
    ];
    for (const [label, value, colour] of courseRows) {
      ui.field(rightX, right, colW, label, value, colour ?? C.text);
      right += 19 * g;
    }

    // A quiet warning if the load simply will not reach.
    const furthest = this.stage.targets.reduce((m, t) => Math.max(m, t.rangeM), 0);
    const transonic = session.dope.transonicRangeM;
    if (transonic && furthest > transonic) {
      const warnY = Math.min(r.y + r.h - 48 * g, Math.max(left, right) + 12 * g);
      const warn: Rect = { x: rightX, y: warnY, w: colW, h: 44 * g };
      fillPanel(ctx, warn, 6, 'rgba(224,112,95,0.10)', C.red);
      paragraph(
        ctx,
        `This load goes transonic at ${
          imperial ? `${Math.round(mToYard(transonic))} yd` : `${Math.round(transonic)} m`
        } and the far targets are past it. Expect the groups to open up.`,
        warn.x + 10 * g,
        warn.y + 13 * g,
        warn.w - 20 * g,
        T.micro * g,
        C.red,
      );
    }
  }
}
