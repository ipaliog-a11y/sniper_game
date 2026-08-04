import { t } from '../core/i18n';
import { resolveLoadout } from '../core/loadout';
import { STAGES } from '../core/range';
import { type App, type Scene } from '../ui/app';
import { audio } from '../ui/audio';
import { type Rect, fillPanel, paragraph, rule, text } from '../ui/gfx';
import { C, T } from '../ui/theme';
import { ArmouryScene } from './ArmouryScene';
import { SettingsScene } from './SettingsScene';
import { StageSelectScene } from './StageSelectScene';

/** The title card. Kept short — nobody came here to read a menu. */
export class MenuScene implements Scene {
  readonly name = 'menu';
  private t0 = 0;

  update(dt: number): void {
    this.t0 += dt;
  }

  render(ctx: CanvasRenderingContext2D, app: App): void {
    const { ui, profile } = app;
    const g = app.gauge;
    const safe = app.safe;
    const loadout = resolveLoadout(profile.loadout);

    // A slow drifting reticle behind the title, because it is the only motion
    // this screen needs.
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.strokeStyle = C.text;
    ctx.lineWidth = 1;
    const cx = app.width / 2 + Math.sin(this.t0 * 0.31) * 14 * g;
    const cy = app.height * 0.42 + Math.cos(this.t0 * 0.23) * 10 * g;
    const rad = Math.min(app.width, app.height) * 0.34;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.moveTo(cx - rad, cy);
    ctx.lineTo(cx + rad, cy);
    ctx.moveTo(cx, cy - rad);
    ctx.lineTo(cx, cy + rad);
    ctx.stroke();
    for (let i = 1; i <= 5; i++) {
      const d = (rad / 6) * i;
      ctx.beginPath();
      ctx.moveTo(cx - 5 * g, cy + d);
      ctx.lineTo(cx + 5 * g, cy + d);
      ctx.stroke();
    }
    ctx.restore();

    const titleY = safe.y + app.height * 0.2;
    text(ctx, t('menu.title'), app.width / 2, titleY, T.huge * g * 1.1, C.text, 'center', 'bold');
    text(
      ctx,
      t('menu.subtitle'),
      app.width / 2,
      titleY + 30 * g,
      T.small * g,
      C.amber,
      'center',
    );

    const cleared = STAGES.filter((s) => profile.records[s.id]?.cleared).length;
    text(
      ctx,
      t('menu.stages_cleared', {
        cleared,
        total: STAGES.length,
        credits: profile.credits.toLocaleString(),
      }),
      app.width / 2,
      titleY + 54 * g,
      T.small * g,
      C.textFaint,
      'center',
    );

    const w = Math.min(safe.w, 340 * g);
    const x = app.width / 2 - w / 2;
    let y = app.height * 0.56;
    const h = 48 * g;
    const gap = 12 * g;

    const item = (label: string, sub: string, accent = false): boolean => {
      const r: Rect = { x, y, w, h };
      const clicked = ui.button(r, '', { accent });
      text(ctx, label, x + 16 * g, y + h / 2 - 7 * g, T.body * g, accent ? C.amber : C.text, 'left', 'bold');
      text(ctx, sub, x + 16 * g, y + h / 2 + 9 * g, T.micro * g, C.textFaint, 'left');
      y += h + gap;
      return clicked;
    };

    if (item(t('menu.course'), t('menu.course_sub', { count: STAGES.length }), true)) {
      audio.unlock();
      audio.tap();
      app.set(new StageSelectScene());
    }
    if (item(t('menu.armoury'), `${loadout.rifle.name} · ${loadout.cartridge.name}`)) {
      audio.unlock();
      audio.tap();
      app.set(new ArmouryScene());
    }
    if (
      item(
        t('menu.settings'),
        profile.settings.imperial ? t('menu.settings_imperial') : t('menu.settings_metric'),
      )
    ) {
      audio.unlock();
      audio.tap();
      app.set(new SettingsScene());
    }

    const footer: Rect = { x, y: app.height - safe.y - 76 * g, w, h: 62 * g };
    if (footer.y > y) {
      fillPanel(ctx, footer, 6, 'rgba(21,29,25,0.6)', C.edgeSoft);
      rule(ctx, footer.x + 12 * g, footer.y + 20 * g, footer.w - 24 * g);
      paragraph(
        ctx,
        t('menu.footer'),
        footer.x + 12 * g,
        footer.y + 34 * g,
        footer.w - 24 * g,
        T.small * g,
        C.textDim,
      );
      text(ctx, t('menu.how_it_works'), footer.x + 12 * g, footer.y + 12 * g, T.micro * g, C.textFaint);
    }
  }
}
