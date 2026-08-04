import { LANG_LABELS, nextLanguage, setLanguage, t } from '../core/i18n';
import { defaultProfile, nextControlMode } from '../core/store';
import { type App, type Scene } from '../ui/app';
import { audio } from '../ui/audio';
import { type Rect, paragraph, rule, text } from '../ui/gfx';
import { C, Scroll, T } from '../ui/ui';
import { GlossaryScene } from './GlossaryScene';
import { MenuScene } from './MenuScene';

/** Preferences, practice mode, debug free-shop, glossary link, hard reset. */
export class SettingsScene implements Scene {
  readonly name = 'settings';
  private confirmWipe = false;
  private confirmFreeShop = false;
  private scroll = new Scroll('settings');

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

    const view: Rect = { x: safe.x, y: safe.y + 44 * g, w: safe.w, h: safe.h - 44 * g };
    // Content height is fixed enough for the scroll region on short phones.
    this.scroll.update(ui.input, view, 920 * g, 1 / 60);

    ctx.save();
    ctx.beginPath();
    ctx.rect(view.x, view.y, view.w, view.h);
    ctx.clip();

    const w = Math.min(view.w, 420 * g);
    const rowH = 42 * g;
    let y = view.y + 6 * g - this.scroll.offset;

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

    // --- sound --------------------------------------------------------
    text(ctx, t('settings.sound_section'), safe.x, y + 2 * g, T.micro * g, C.amber);
    y += 16 * g;
    row(t('settings.sound'), s.sound, () => {
      s.sound = !s.sound;
      audio.applySettings(s);
    }, t('settings.sound_note'));
    row(
      t('settings.sound_sfx'),
      s.soundSfx,
      () => {
        s.soundSfx = !s.soundSfx;
        audio.applySettings(s);
      },
      t('settings.sound_sfx_note'),
    );
    row(
      t('settings.sound_env'),
      s.soundEnv,
      () => {
        s.soundEnv = !s.soundEnv;
        audio.applySettings(s);
      },
      t('settings.sound_env_note'),
    );

    text(ctx, t('settings.master_volume'), safe.x, y + 2 * g, T.micro * g, C.textFaint);
    text(
      ctx,
      `${Math.round(s.masterVolume * 100)}%`,
      safe.x + w,
      y + 2 * g,
      T.body * g,
      C.text,
      'right',
    );
    y += 18 * g;
    const nextVol = ui.slider('master-vol', { x: safe.x, y, w, h: 20 * g }, s.masterVolume, 0, 1);
    if (Math.abs(nextVol - s.masterVolume) > 0.001) {
      s.masterVolume = nextVol;
      audio.applySettings(s);
      app.save();
    }
    y += 36 * g;

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
    y += 14 * g;
    paragraph(ctx, t('settings.aim_note'), safe.x, y, w, T.small * g, C.textDim);
    y += 44 * g;

    const gloss: Rect = { x: safe.x, y, w, h: 40 * g };
    if (ui.button(gloss, t('settings.glossary'), { size: T.small * g })) {
      audio.tap();
      app.save();
      app.set(new GlossaryScene('settings'));
    }
    y += 50 * g;

    // --- temporary debug: free armoury ---
    rule(ctx, safe.x, y, w);
    y += 14 * g;
    text(ctx, t('settings.debug_section'), safe.x, y, T.micro * g, C.amber);
    y += 16 * g;

    const freeLabel = s.debugFreeShop
      ? t('settings.free_shop_off')
      : this.confirmFreeShop
        ? t('settings.free_shop_confirm')
        : t('settings.free_shop');
    const freeBtn: Rect = { x: safe.x, y, w, h: 40 * g };
    if (
      ui.button(freeBtn, freeLabel, {
        size: T.small * g,
        danger: this.confirmFreeShop || s.debugFreeShop,
        accent: this.confirmFreeShop || s.debugFreeShop,
      })
    ) {
      if (s.debugFreeShop) {
        s.debugFreeShop = false;
        this.confirmFreeShop = false;
        app.save();
        app.toast(t('settings.free_shop_disabled'), 'info');
        audio.click();
      } else if (this.confirmFreeShop) {
        s.debugFreeShop = true;
        this.confirmFreeShop = false;
        app.save();
        app.toast(t('settings.free_shop_enabled'), 'good');
        audio.chime(true);
      } else {
        this.confirmFreeShop = true;
        audio.tap();
      }
    }
    y += 46 * g;
    paragraph(ctx, t('settings.free_shop_note'), safe.x, y, w, T.small * g, C.textDim);
    y += 48 * g;

    rule(ctx, safe.x, y, w);
    y += 14 * g;

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
        audio.applySettings(app.profile.settings);
        app.save();
        app.toast(t('settings.erased'), 'bad');
        this.confirmWipe = false;
        this.confirmFreeShop = false;
      } else {
        this.confirmWipe = true;
      }
    }
    y += 50 * g;
    text(ctx, t('settings.reset_note'), safe.x, y, T.micro * g, C.textFaint);

    ctx.restore();
  }
}
