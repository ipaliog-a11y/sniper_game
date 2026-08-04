import { catalogName } from '../core/catalogLabels';
import { nextBiomeOption, prevBiomeOption } from '../core/biome';
import {
  type FreeFieldConfig,
  type FreeFieldTargetConfig,
  FREE_FIELD_MAX_TARGETS,
  FREE_FIELD_MIN_TARGETS,
  FREE_FIELD_RANGE_STEP_M,
  FREE_FIELD_MAX_RANGE_M,
  FREE_FIELD_MIN_RANGE_M,
  buildFreeFieldStage,
  clampRangeM,
  clampTargetCount,
  defaultFreeFieldConfig,
  defaultFreeFieldTarget,
  fullyRandomiseFreeField,
  nextShape,
  nextWeatherOption,
  prevWeatherOption,
  randomiseFreeField,
  suggestedRounds,
} from '../core/freeField';
import { t } from '../core/i18n';
import { resolveLoadout } from '../core/loadout';
import { mToYard } from '../core/units';
import { type App, type Scene } from '../ui/app';
import { audio } from '../ui/audio';
import { type Rect, fillPanel, paragraph, rule, text } from '../ui/gfx';
import { C, Scroll, T } from '../ui/ui';
import { ArmouryScene } from './ArmouryScene';
import { BriefScene } from './BriefScene';
import { MenuScene } from './MenuScene';

/**
 * Free Field setup: pick plates, weather, known vs hidden ranges, then kit and
 * go hot. The string has no time limit — the stage clock only counts up.
 */
export class FreeFieldScene implements Scene {
  readonly name = 'free-field';
  private config: FreeFieldConfig;
  private scroll = new Scroll('freefield');

  constructor(config?: FreeFieldConfig) {
    this.config = config ? structuredClone(config) : defaultFreeFieldConfig();
    if (!this.config.biomeId) this.config.biomeId = 'open';
  }

  update(): void {}

  private fmtRange(m: number, imperial: boolean): string {
    return imperial ? `${Math.round(mToYard(m))} yd` : `${Math.round(m)} m`;
  }

  private setTargetCount(n: number): void {
    const count = clampTargetCount(n);
    const list = this.config.targets;
    while (list.length < count) {
      const last = list[list.length - 1];
      const nextRange = clampRangeM((last?.rangeM ?? 300) + 100);
      list.push(defaultFreeFieldTarget(nextRange));
    }
    while (list.length > count) list.pop();
    // Keep ammo sensible when the shooter only changes plate count.
    this.config.rounds = Math.max(this.config.rounds, suggestedRounds(count));
  }

  private weatherLabel(): string {
    if (this.config.weatherPresetId === 'random') return t('free_field.weather_random');
    return t(`weather.${this.config.weatherPresetId}.name`);
  }

  private biomeLabel(): string {
    if (this.config.biomeId === 'random') return t('free_field.biome_random');
    return t(`biome.${this.config.biomeId}.name`);
  }

  /** Ensure older saved/in-memory configs still have a biome field. */
  private ensureConfig(): void {
    if (!this.config.biomeId) this.config.biomeId = 'open';
  }

  render(ctx: CanvasRenderingContext2D, app: App): void {
    const { ui, profile } = app;
    const g = app.gauge;
    const safe = app.safe;
    const imperial = profile.settings.imperial;
    const loadout = resolveLoadout(profile.loadout);

    text(ctx, t('free_field.title'), safe.x, safe.y + 12 * g, T.head * g, C.text, 'left', 'bold');
    const back: Rect = { x: safe.x + safe.w - 78 * g, y: safe.y, w: 78 * g, h: 30 * g };
    if (ui.button(back, t('common.menu'), { size: T.small * g })) {
      audio.tap();
      app.set(new MenuScene());
    }
    rule(ctx, safe.x, safe.y + 34 * g, safe.w);

    const footerH = 52 * g;
    const view: Rect = {
      x: safe.x,
      y: safe.y + 44 * g,
      w: safe.w,
      h: safe.h - 44 * g - footerH - 10 * g,
    };

    this.ensureConfig();

    // Rough content height: weather + biome + targets + rounds + kit.
    const targetRowH = 72 * g;
    const contentH =
      120 * g +
      90 * g +
      50 * g +
      this.config.targets.length * targetRowH +
      56 * g +
      100 * g;
    this.scroll.update(ui.input, view, contentH, 1 / 60);
    const blocked = this.scroll.isDragging(ui.input);

    ctx.save();
    ctx.beginPath();
    ctx.rect(view.x, view.y, view.w, view.h);
    ctx.clip();

    let y = view.y - this.scroll.offset;

    // --- blurb ---
    const blurbH = paragraph(
      ctx,
      t('free_field.blurb'),
      view.x,
      y + 8 * g,
      view.w,
      T.small * g,
      C.textDim,
    );
    y += blurbH + 16 * g;

    // --- weather ---
    fillPanel(ctx, { x: view.x, y, w: view.w, h: 78 * g }, 8, C.panel, C.edge);
    text(ctx, t('free_field.weather'), view.x + 12 * g, y + 16 * g, T.small * g, C.amber, 'left', 'bold');
    text(
      ctx,
      this.weatherLabel(),
      view.x + 12 * g,
      y + 38 * g,
      T.body * g,
      C.text,
      'left',
      'bold',
    );
    text(
      ctx,
      t('free_field.weather_note'),
      view.x + 12 * g,
      y + 56 * g,
      T.micro * g,
      C.textFaint,
    );

    const btnW = 36 * g;
    const btnH = 30 * g;
    const weatherBtnsY = y + 22 * g;
    const randW = 96 * g;
    const prevR: Rect = {
      x: view.x + view.w - 12 * g - btnW * 2 - 8 * g - randW - 8 * g,
      y: weatherBtnsY,
      w: btnW,
      h: btnH,
    };
    const nextR: Rect = { x: prevR.x + btnW + 8 * g, y: weatherBtnsY, w: btnW, h: btnH };
    const randR: Rect = { x: nextR.x + btnW + 8 * g, y: weatherBtnsY, w: randW, h: btnH };
    if (!blocked && ui.button(prevR, '‹', { size: T.head * g })) {
      audio.tap();
      this.config.weatherPresetId = prevWeatherOption(this.config.weatherPresetId);
    }
    if (!blocked && ui.button(nextR, '›', { size: T.head * g })) {
      audio.tap();
      this.config.weatherPresetId = nextWeatherOption(this.config.weatherPresetId);
    }
    if (!blocked && ui.button(randR, t('free_field.randomise'), { size: T.micro * g, accent: true })) {
      audio.tap();
      // Light randomise: new seed (and random preset if mode is random).
      this.config = randomiseFreeField(this.config);
      if (this.config.weatherPresetId === 'random') {
        // Leave as random so build picks at go-hot; also re-seed only.
      }
      app.toast(t('free_field.weather_rerolled'), 'info');
    }
    y += 90 * g;

    // --- scenery biome ---
    fillPanel(ctx, { x: view.x, y, w: view.w, h: 78 * g }, 8, C.panel, C.edge);
    text(ctx, t('free_field.biome'), view.x + 12 * g, y + 16 * g, T.small * g, C.amber, 'left', 'bold');
    text(
      ctx,
      this.biomeLabel(),
      view.x + 12 * g,
      y + 38 * g,
      T.body * g,
      C.text,
      'left',
      'bold',
    );
    text(
      ctx,
      t('free_field.biome_note'),
      view.x + 12 * g,
      y + 56 * g,
      T.micro * g,
      C.textFaint,
    );
    const biomeBtnsY = y + 22 * g;
    const bPrev: Rect = {
      x: view.x + view.w - 12 * g - btnW * 2 - 8 * g,
      y: biomeBtnsY,
      w: btnW,
      h: btnH,
    };
    const bNext: Rect = { x: bPrev.x + btnW + 8 * g, y: biomeBtnsY, w: btnW, h: btnH };
    if (!blocked && ui.button(bPrev, '‹', { size: T.head * g })) {
      audio.tap();
      this.config.biomeId = prevBiomeOption(this.config.biomeId);
    }
    if (!blocked && ui.button(bNext, '›', { size: T.head * g })) {
      audio.tap();
      this.config.biomeId = nextBiomeOption(this.config.biomeId);
    }
    y += 90 * g;

    // Full shuffle of plates + weather + scenery
    const fullRand: Rect = { x: view.x, y, w: view.w, h: 34 * g };
    if (!blocked && ui.button(fullRand, t('free_field.randomise_all'), { size: T.small * g })) {
      audio.tap();
      this.config = fullyRandomiseFreeField(this.config);
      app.toast(t('free_field.shuffled'), 'good');
    }
    y += 46 * g;

    // --- plate count ---
    fillPanel(ctx, { x: view.x, y, w: view.w, h: 44 * g }, 8, C.panel, C.edge);
    text(ctx, t('free_field.targets'), view.x + 12 * g, y + 22 * g, T.body * g, C.text, 'left', 'bold');
    text(
      ctx,
      `${this.config.targets.length}`,
      view.x + view.w / 2,
      y + 22 * g,
      T.title * g,
      C.amber,
      'center',
      'bold',
    );
    const steppersY = y + 7 * g;
    const steph = 30 * g;
    const stepw = 40 * g;
    if (
      !blocked &&
      ui.stepper(
        'ff-n-minus',
        { x: view.x + view.w - 12 * g - stepw * 2 - 8 * g, y: steppersY, w: stepw, h: steph },
        '−',
        this.config.targets.length <= FREE_FIELD_MIN_TARGETS,
      )
    ) {
      this.setTargetCount(this.config.targets.length - 1);
    }
    if (
      !blocked &&
      ui.stepper(
        'ff-n-plus',
        { x: view.x + view.w - 12 * g - stepw, y: steppersY, w: stepw, h: steph },
        '+',
        this.config.targets.length >= FREE_FIELD_MAX_TARGETS,
      )
    ) {
      this.setTargetCount(this.config.targets.length + 1);
    }
    y += 56 * g;

    // --- each target ---
    this.config.targets.forEach((tgt, i) => {
      y = this.drawTargetRow(ctx, app, view.x, y, view.w, tgt, i, blocked, imperial, g);
    });

    // Global unknown toggle
    const allUnknown = this.config.targets.every((t) => t.unknownRange);
    const unkToggle: Rect = { x: view.x, y, w: view.w, h: 36 * g };
    if (!blocked && ui.toggle(unkToggle, t('free_field.all_unknown'), allUnknown)) {
      audio.tap();
      const next = !allUnknown;
      for (const plate of this.config.targets) plate.unknownRange = next;
    }
    y += 48 * g;

    // --- rounds ---
    fillPanel(ctx, { x: view.x, y, w: view.w, h: 44 * g }, 8, C.panel, C.edge);
    text(ctx, t('free_field.rounds'), view.x + 12 * g, y + 22 * g, T.body * g, C.text, 'left', 'bold');
    text(
      ctx,
      `${this.config.rounds}`,
      view.x + view.w / 2,
      y + 22 * g,
      T.title * g,
      C.amber,
      'center',
      'bold',
    );
    if (
      !blocked &&
      ui.stepper(
        'ff-rnd-minus',
        { x: view.x + view.w - 12 * g - stepw * 2 - 8 * g, y: y + 7 * g, w: stepw, h: steph },
        '−',
        this.config.rounds <= this.config.targets.length,
      )
    ) {
      this.config.rounds = Math.max(this.config.targets.length, this.config.rounds - 1);
    }
    if (
      !blocked &&
      ui.stepper(
        'ff-rnd-plus',
        { x: view.x + view.w - 12 * g - stepw, y: y + 7 * g, w: stepw, h: steph },
        '+',
        this.config.rounds >= 40,
      )
    ) {
      this.config.rounds = Math.min(40, this.config.rounds + 1);
    }
    y += 56 * g;

    // Kit summary
    fillPanel(ctx, { x: view.x, y, w: view.w, h: 52 * g }, 8, 'rgba(232,163,61,0.06)', C.edgeSoft);
    text(ctx, t('free_field.kit'), view.x + 12 * g, y + 16 * g, T.small * g, C.amber, 'left', 'bold');
    text(
      ctx,
      `${catalogName(loadout.rifle.id, loadout.rifle.name)} · ${catalogName(loadout.cartridge.id, loadout.cartridge.name)}`,
      view.x + 12 * g,
      y + 36 * g,
      T.small * g,
      C.text,
    );
    y += 64 * g;

    ctx.restore();

    // --- footer: kit + brief ---
    const half = (safe.w - 10 * g) / 2;
    const kitBtn: Rect = {
      x: safe.x,
      y: safe.y + safe.h - footerH,
      w: half,
      h: footerH - 4 * g,
    };
    const goBtn: Rect = {
      x: safe.x + half + 10 * g,
      y: kitBtn.y,
      w: half,
      h: kitBtn.h,
    };
    if (ui.button(kitBtn, t('free_field.kit_btn'), { size: T.body * g })) {
      audio.tap();
      app.set(
        new ArmouryScene({
          freeKit: true,
          returnTo: () => new FreeFieldScene(this.config),
        }),
      );
    }
    if (ui.button(goBtn, t('free_field.go'), { accent: true, size: T.body * g })) {
      audio.unlock();
      audio.tap();
      // Fresh seed when weather is "random" so each go-hot is a new day.
      if (this.config.weatherPresetId === 'random') {
        this.config = randomiseFreeField(this.config);
      }
      const stage = buildFreeFieldStage(this.config);
      app.set(new BriefScene(stage, { freeFieldConfig: this.config }));
    }
  }

  private drawTargetRow(
    ctx: CanvasRenderingContext2D,
    app: App,
    x: number,
    y: number,
    w: number,
    tgt: FreeFieldTargetConfig,
    index: number,
    blocked: boolean,
    imperial: boolean,
    g: number,
  ): number {
    const { ui } = app;
    const h = 64 * g;
    fillPanel(ctx, { x, y, w, h }, 8, C.panel, C.edge);

    text(
      ctx,
      t('free_field.target_n', { n: index + 1 }),
      x + 12 * g,
      y + 16 * g,
      T.micro * g,
      C.textFaint,
    );

    // Shape cycle
    const shapeBtn: Rect = { x: x + 12 * g, y: y + 28 * g, w: 110 * g, h: 28 * g };
    if (!blocked && ui.button(shapeBtn, t(`shape.${tgt.shape}`), { size: T.micro * g })) {
      audio.tap();
      tgt.shape = nextShape(tgt.shape);
    }

    // Range steppers
    const rangeLabel = this.fmtRange(tgt.rangeM, imperial);
    const midX = x + w * 0.48;
    text(ctx, rangeLabel, midX, y + 20 * g, T.body * g, tgt.unknownRange ? C.textDim : C.amber, 'center', 'bold');
    if (tgt.unknownRange) {
      text(ctx, t('free_field.range_hidden'), midX, y + 38 * g, T.micro * g, C.textFaint, 'center');
    }

    const stepw = 34 * g;
    const steph = 26 * g;
    const sy = y + 32 * g;
    if (
      !blocked &&
      ui.stepper(
        `ff-r-${index}-m`,
        { x: midX - 70 * g - stepw, y: sy, w: stepw, h: steph },
        '−',
        tgt.rangeM <= FREE_FIELD_MIN_RANGE_M,
      )
    ) {
      tgt.rangeM = clampRangeM(tgt.rangeM - FREE_FIELD_RANGE_STEP_M);
    }
    if (
      !blocked &&
      ui.stepper(
        `ff-r-${index}-p`,
        { x: midX + 70 * g, y: sy, w: stepw, h: steph },
        '+',
        tgt.rangeM >= FREE_FIELD_MAX_RANGE_M,
      )
    ) {
      tgt.rangeM = clampRangeM(tgt.rangeM + FREE_FIELD_RANGE_STEP_M);
    }

    // Unknown range toggle (compact button)
    const unkBtn: Rect = {
      x: x + w - 12 * g - 100 * g,
      y: y + 18 * g,
      w: 100 * g,
      h: 30 * g,
    };
    if (
      !blocked &&
      ui.button(unkBtn, tgt.unknownRange ? t('free_field.unknown_on') : t('free_field.unknown_off'), {
        size: T.micro * g,
        accent: tgt.unknownRange,
      })
    ) {
      audio.tap();
      tgt.unknownRange = !tgt.unknownRange;
    }

    return y + h + 8 * g;
  }
}
