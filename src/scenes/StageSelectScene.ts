import { t } from '../core/i18n';
import { STAGES, stageMaxRange } from '../core/range';
import { gradeColour } from '../core/scoring';
import { presetById } from '../core/weather';
import { type App, type Scene } from '../ui/app';
import { audio } from '../ui/audio';
import { type Rect, fillPanel, paragraph, rule, text } from '../ui/gfx';
import { C, Scroll, T } from '../ui/ui';
import { mToYard } from '../core/units';
import { BriefScene } from './BriefScene';
import { MenuScene } from './MenuScene';

/**
 * The course of fire. Stages unlock in order, but only just — a Marksman run
 * is enough to move on, so nobody gets stuck grinding the first plate rack.
 */
export class StageSelectScene implements Scene {
  readonly name = 'stages';
  private scroll = new Scroll('stagelist');

  update(): void {}

  private unlocked(app: App, index: number): boolean {
    if (index === 0) return true;
    const previous = STAGES[index - 1];
    const record = app.profile.records[previous.id];
    return (record?.bestFraction ?? 0) >= STAGES[index].unlockScore;
  }

  render(ctx: CanvasRenderingContext2D, app: App): void {
    const { ui, profile } = app;
    const g = app.gauge;
    const safe = app.safe;
    const imperial = profile.settings.imperial;

    text(ctx, t('stages.title'), safe.x, safe.y + 12 * g, T.head * g, C.text, 'left', 'bold');
    const back: Rect = { x: safe.x + safe.w - 78 * g, y: safe.y, w: 78 * g, h: 30 * g };
    if (ui.button(back, t('common.menu'), { size: T.small * g })) {
      audio.tap();
      app.set(new MenuScene());
    }
    rule(ctx, safe.x, safe.y + 34 * g, safe.w);

    const view: Rect = { x: safe.x, y: safe.y + 44 * g, w: safe.w, h: safe.h - 44 * g };
    // Briefs wrap to two lines on a wide screen and three on a phone, so the
    // card is sized for whichever it is rather than padded for the worst case.
    const cardH = (view.w > 560 * g ? 92 : 116) * g;
    const gap = 10 * g;
    this.scroll.update(ui.input, view, STAGES.length * (cardH + gap) + 8 * g, 1 / 60);
    const blocked = this.scroll.isDragging(ui.input);

    ctx.save();
    ctx.beginPath();
    ctx.rect(view.x, view.y, view.w, view.h);
    ctx.clip();

    STAGES.forEach((stage, i) => {
      const y = view.y + i * (cardH + gap) - this.scroll.offset;
      if (y > view.y + view.h || y + cardH < view.y) return;
      const r: Rect = { x: view.x, y, w: view.w, h: cardH };
      const open = this.unlocked(app, i);
      const record = profile.records[stage.id];

      fillPanel(ctx, r, 8, open ? C.panel : 'rgba(21,29,25,0.45)', open ? C.edge : C.edgeSoft);

      const pad = 14 * g;
      const stageName = t(`stage.${stage.id}.name`);
      text(ctx, stageName, r.x + pad, r.y + 20 * g, T.body * g, open ? C.text : C.textFaint, 'left', 'bold');

      const preset = presetById(stage.presetId);
      const maxRange = stageMaxRange(stage);
      const rangeStr = imperial
        ? `${Math.round(mToYard(maxRange))} yd`
        : `${Math.round(maxRange)} m`;
      const meta = t('stages.meta', {
        targets: stage.targets.length,
        range: rangeStr,
        rounds: stage.rounds,
        weather: t(`weather.${preset.id}.name`),
      });
      text(ctx, meta, r.x + pad, r.y + 38 * g, T.micro * g, C.textFaint);

      if (open) {
        paragraph(
          ctx,
          t(`stage.${stage.id}.brief`),
          r.x + pad,
          r.y + 58 * g,
          r.w - pad * 2 - 74 * g,
          T.small * g,
          C.textDim,
        );
      } else {
        text(
          ctx,
          t('stages.locked', { pct: Math.round(stage.unlockScore * 100) }),
          r.x + pad,
          r.y + 62 * g,
          T.small * g,
          C.textFaint,
        );
      }

      if (record && record.attempts > 0) {
        const colour = gradeColour(record.bestGrade);
        text(
          ctx,
          t(`grade.${record.bestGrade}`).toUpperCase(),
          r.x + r.w - pad,
          r.y + 20 * g,
          T.small * g,
          colour,
          'right',
          'bold',
        );
        text(
          ctx,
          t('stages.record', {
            pct: Math.round(record.bestFraction * 100),
            pts: record.bestPoints,
          }),
          r.x + r.w - pad,
          r.y + 38 * g,
          T.micro * g,
          C.textFaint,
          'right',
        );
      } else if (open) {
        text(ctx, t('stages.not_shot'), r.x + r.w - pad, r.y + 20 * g, T.micro * g, C.textFaint, 'right');
      }

      if (open && !blocked && ui.input.takeTap(r.x, r.y, r.w, r.h)) {
        audio.unlock();
        audio.tap();
        app.set(new BriefScene(stage));
      }
    });

    ctx.restore();
  }
}
