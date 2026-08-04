import { LANG_LABELS, nextLanguage, setLanguage, t } from '../core/i18n';
import { defaultProfile, nextControlMode } from '../core/store';
import { type App, type Scene } from '../ui/app';
import { audio } from '../ui/audio';
import { type Rect, paragraph, rule, text } from '../ui/gfx';
import { C, T } from '../ui/ui';
import { MenuScene } from './MenuScene';

/** Preferences, plus the two escape hatches: practice mode and a hard reset. */
export class SettingsScene implements Scene {
  readonly name = 'settings';
  private confirmWipe = false;

  update(): void {}

  render(ctx: CanvasRenderingContext2D, app: App): void {
    const { ui, profile } = app;
    const g = app.gauge;
    const safe = app.safe;
    const s = profile.settings;

    text(ctx, t('settings.title'), safe.x, safe.y + 12 * g, T.head * g, C.text, 'left', 'bold');
    const back: Rect = { x: safe.x + safe.w - 78 * g, y: safe.y, w: 78 * g, h: 30 * g };
    if (ui.button(back, t('common.menu'), { size: T.small * g })) {
      audio.tap();
      app.save();
      app.set(new MenuScene());
    }
    rule(ctx, safe.x, safe.y + 34 * g, safe.w);

    let y = safe.y + 50 * g;
    const w = Math.min(safe.w, 420 * g);
    const rowH = 42 * g;

    const row = (label: string, on: boolean, onToggle: () => void, note?: string): void => {
      if (ui.toggle({ x: safe.x, y, w, h: rowH - 8 * g }, label, on)) {
        onToggle();
        audio.click();
        app.save();
      }
      if (note) {
        text(ctx, note, safe.x, y + rowH - 2 * g, T.micro * g, C.textFaint);
        y += 14 * g;
      }
      y += rowH;
    };

    // Language sits at the top so players find it before anything else.
    text(ctx, t('settings.language'), safe.x, y + 2 * g, T.micro * g, C.textFaint);
    const langBtn: Rect = { x: safe.x + w - 140 * g, y, w: 140 * g, h: 32 * g };
    if (ui.button(langBtn, LANG_LABELS[s.language], { size: T.small * g, accent: true })) {
      s.language = nextLanguage(s.language);
      setLanguage(s.language);
      audio.click();
      app.save();
    }
    y += 36 * g;
    text(ctx, t('settings.language_note'), safe.x, y, T.micro * g, C.textFaint);
    y += 22 * g;

    // Controls: touch (toolbar) vs mouse (wheel / RMB / LMB).
    text(ctx, t('settings.controls'), safe.x, y + 2 * g, T.micro * g, C.textFaint);
    const modeBtn: Rect = { x: safe.x + w - 140 * g, y, w: 140 * g, h: 32 * g };
    if (
      ui.button(modeBtn, t(`settings.controls_${s.controlMode}`), {
        size: T.small * g,
        accent: true,
      })
    ) {
      s.controlMode = nextControlMode(s.controlMode);
      audio.click();
      app.save();
    }
    y += 36 * g;
    text(
      ctx,
      s.controlMode === 'mouse' ? t('settings.controls_mouse_note') : t('settings.controls_touch_note'),
      safe.x,
      y,
      T.micro * g,
      C.textFaint,
    );
    y += 22 * g;

    row(t('settings.imperial'), s.imperial, () => (s.imperial = !s.imperial), t('settings.imperial_note'));
    row(
      t('settings.invert'),
      s.invertDrag,
      () => (s.invertDrag = !s.invertDrag),
      t('settings.invert_note'),
    );
    row(t('settings.sound'), s.sound, () => {
      s.sound = !s.sound;
      audio.enabled = s.sound;
    });
    row(
      t('settings.practice'),
      s.assist,
      () => (s.assist = !s.assist),
      t('settings.practice_note'),
    );

    text(ctx, t('settings.aim_sens'), safe.x, y + 2 * g, T.micro * g, C.textFaint);
    text(ctx, `${s.aimSensitivity.toFixed(2)}x`, safe.x + w, y + 2 * g, T.body * g, C.text, 'right');
    y += 18 * g;
    const next = ui.slider('sens', { x: safe.x, y, w, h: 20 * g }, s.aimSensitivity, 0.3, 2.5);
    if (Math.abs(next - s.aimSensitivity) > 0.001) {
      s.aimSensitivity = next;
      app.save();
    }
    y += 40 * g;

    rule(ctx, safe.x, y, w);
    y += 18 * g;

    paragraph(ctx, t('settings.aim_note'), safe.x, y, w, T.small * g, C.textDim);
    y += 46 * g;

    const wipe: Rect = { x: safe.x, y, w, h: 40 * g };
    if (
      ui.button(wipe, this.confirmWipe ? t('settings.reset_confirm') : t('settings.reset'), {
        danger: this.confirmWipe,
        accent: this.confirmWipe,
        size: T.small * g,
      })
    ) {
      if (this.confirmWipe) {
        app.profile = defaultProfile();
        setLanguage(app.profile.settings.language);
        app.save();
        app.toast(t('settings.erased'), 'bad');
        this.confirmWipe = false;
      } else {
        this.confirmWipe = true;
      }
    }
    y += 50 * g;
    text(ctx, t('settings.reset_note'), safe.x, y, T.micro * g, C.textFaint);
  }
}
