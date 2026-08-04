import { t } from '../core/i18n';
import type { StageScore } from '../core/scoring';
import { gradeColour } from '../core/scoring';
import type { Session } from '../core/session';
import { recordStage } from '../core/store';
import { mToYard } from '../core/units';
import { type App, type Scene } from '../ui/app';
import { audio } from '../ui/audio';
import { type Rect, bar, fillPanel, rule, text } from '../ui/gfx';
import { C, Scroll, T } from '../ui/ui';
import { BriefScene } from './BriefScene';
import { StageSelectScene } from './StageSelectScene';

/**
 * The score card. First round hit percentage is given the largest number on the
 * page on purpose: it is the only statistic on here that would matter anywhere
 * outside a range.
 */
export class ResultScene implements Scene {
  readonly name = 'result';
  private readonly session: Session;
  private readonly score: StageScore;
  private scroll = new Scroll('result');
  private reveal = 0;
  private banked = false;

  constructor(session: Session, score: StageScore) {
    this.session = session;
    this.score = score;
  }

  enter(app: App): void {
    audio.stopWind();
    if (this.banked) return;
    this.banked = true;
    const stage = this.session.stage;
    app.profile.credits += this.score.reward;
    recordStage(
      app.profile,
      stage.id,
      this.score.fraction,
      this.score.points,
      this.score.grade,
      this.score.elapsedS,
      this.score.cleared,
    );
    app.save();
    audio.chime(this.score.fraction >= 0.56);
  }

  update(dt: number): void {
    this.reveal = Math.min(1, this.reveal + dt * 1.6);
  }

  render(ctx: CanvasRenderingContext2D, app: App): void {
    const { ui } = app;
    const g = app.gauge;
    const safe = app.safe;
    const score = this.score;
    const imperial = app.profile.settings.imperial;

    ui.fitText(
      t(`stage.${this.session.stage.id}.name`),
      safe.x,
      safe.y + 12 * g,
      safe.w * 0.6,
      T.head * g,
      C.text,
      'left',
      'bold',
    );
    text(
      ctx,
      t(`grade.${score.grade}`).toUpperCase(),
      safe.x + safe.w,
      safe.y + 12 * g,
      T.head * g,
      gradeColour(score.grade),
      'right',
      'bold',
    );
    rule(ctx, safe.x, safe.y + 32 * g, safe.w);

    // Headline: points, percentage, and the number that actually matters.
    let y = safe.y + 52 * g;
    const shown = Math.round(score.points * this.reveal);
    text(ctx, `${shown}`, safe.x, y + 10 * g, T.huge * g, C.text, 'left', 'bold');
    text(ctx, `/ ${score.maxPoints}`, safe.x + 96 * g, y + 18 * g, T.body * g, C.textFaint);

    text(ctx, t('result.frh'), safe.x + safe.w, y - 4 * g, T.micro * g, C.textFaint, 'right');
    text(
      ctx,
      `${score.frhPercent.toFixed(0)}%`,
      safe.x + safe.w,
      y + 16 * g,
      T.title * g,
      score.frhPercent >= 60 ? C.green : C.amber,
      'right',
      'bold',
    );
    y += 44 * g;

    const meter: Rect = { x: safe.x, y, w: safe.w, h: 8 * g };
    bar(ctx, meter, score.fraction * this.reveal, gradeColour(score.grade));
    y += 22 * g;

    const summary: Array<[string, string]> = [
      [t('result.plates'), `${score.hits} / ${score.targets}`],
      [t('result.rounds'), `${score.shots}`],
      [t('result.time'), `${score.elapsedS.toFixed(1)} s`],
      [t('result.mean_miss'), `${score.meanRadialMil.toFixed(2)} MIL`],
      [t('result.payout'), `${score.reward.toLocaleString()} cr`],
    ];
    const colW = safe.w / summary.length;
    summary.forEach(([label, value], i) => {
      text(ctx, label, safe.x + i * colW, y, T.micro * g, C.textFaint);
      ui.fitText(value, safe.x + i * colW, y + 16 * g, colW - 8 * g, T.body * g, i === 4 ? C.amber : C.text);
    });
    y += 34 * g;
    rule(ctx, safe.x, y, safe.w);
    y += 10 * g;

    const footerH = 48 * g;
    const view: Rect = { x: safe.x, y, w: safe.w, h: safe.h - (y - safe.y) - footerH - 10 * g };
    const rowH = 46 * g;
    this.scroll.update(ui.input, view, score.perTarget.length * rowH + 6 * g, 1 / 60);

    ctx.save();
    ctx.beginPath();
    ctx.rect(view.x, view.y, view.w, view.h);
    ctx.clip();

    score.perTarget.forEach((tgt, i) => {
      const runtime = this.session.targets.find((r) => r.target.id === tgt.targetId);
      const ry = view.y + 4 * g + i * rowH - this.scroll.offset;
      if (ry > view.y + view.h || ry + rowH < view.y) return;
      const r: Rect = { x: view.x, y: ry, w: view.w, h: rowH - 6 * g };
      fillPanel(ctx, r, 6, tgt.hit ? 'rgba(127,201,138,0.07)' : 'rgba(224,112,95,0.06)', C.edgeSoft);

      const range = runtime ? runtime.target.rangeM : 0;
      const label = imperial ? `${Math.round(mToYard(range))} yd` : `${Math.round(range)} m`;
      text(ctx, label, r.x + 12 * g, r.y + 15 * g, T.body * g, C.text, 'left', 'bold');
      text(
        ctx,
        runtime ? t(`shape.${runtime.target.shape}`) : '',
        r.x + 12 * g,
        r.y + 31 * g,
        T.micro * g,
        C.textFaint,
      );

      const detail = tgt.hit
        ? `${tgt.firstRound ? t('result.first_round') : t('result.n_rounds', { n: tgt.rounds })} · ${tgt.timeToHitS.toFixed(1)} s · ${t(
            'result.centred',
            { pct: Math.round(tgt.quality * 100) },
          )}`
        : tgt.rounds > 0
          ? t('result.no_hit', { n: tgt.rounds })
          : t('result.never');
      text(ctx, detail, r.x + 90 * g, r.y + 23 * g, T.small * g, tgt.hit ? C.textDim : C.red);

      text(
        ctx,
        `${tgt.points}`,
        r.x + r.w - 12 * g,
        r.y + 23 * g,
        T.body * g,
        tgt.hit ? C.text : C.textFaint,
        'right',
        'bold',
      );
    });
    ctx.restore();

    const half = safe.w / 2 - 5 * g;
    const again: Rect = { x: safe.x, y: safe.y + safe.h - footerH, w: half, h: footerH - 4 * g };
    const next: Rect = { x: safe.x + half + 10 * g, y: again.y, w: half, h: again.h };
    if (ui.button(again, t('result.again'), { size: T.body * g })) {
      audio.tap();
      app.set(new BriefScene(this.session.stage));
    }
    if (ui.button(next, t('result.course'), { accent: true, size: T.body * g })) {
      audio.tap();
      app.set(new StageSelectScene());
    }
  }
}
