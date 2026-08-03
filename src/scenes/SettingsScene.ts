import { defaultProfile } from '../core/store';
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

    text(ctx, 'SETTINGS', safe.x, safe.y + 12 * g, T.head * g, C.text, 'left', 'bold');
    const back: Rect = { x: safe.x + safe.w - 78 * g, y: safe.y, w: 78 * g, h: 30 * g };
    if (ui.button(back, 'MENU', { size: T.small * g })) {
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

    row('IMPERIAL UNITS', s.imperial, () => (s.imperial = !s.imperial), 'yards, inches and Fahrenheit');
    row('INVERT AIM DRAG', s.invertDrag, () => (s.invertDrag = !s.invertDrag), 'drag the picture instead of the rifle');
    row('SOUND', s.sound, () => {
      s.sound = !s.sound;
      audio.enabled = s.sound;
    });
    row(
      'PRACTICE MODE',
      s.assist,
      () => (s.assist = !s.assist),
      'shows ranges and the true firing solution regardless of kit; scores still count',
    );

    text(ctx, 'AIM SENSITIVITY', safe.x, y + 2 * g, T.micro * g, C.textFaint);
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

    paragraph(
      ctx,
      'Aiming is geared per radian, so higher magnification is automatically finer. This only changes the overall gearing.',
      safe.x,
      y,
      w,
      T.small * g,
      C.textDim,
    );
    y += 46 * g;

    const wipe: Rect = { x: safe.x, y, w, h: 40 * g };
    if (
      ui.button(wipe, this.confirmWipe ? 'TAP AGAIN TO ERASE EVERYTHING' : 'RESET PROGRESS', {
        danger: this.confirmWipe,
        accent: this.confirmWipe,
        size: T.small * g,
      })
    ) {
      if (this.confirmWipe) {
        app.profile = defaultProfile();
        app.save();
        app.toast('Progress erased', 'bad');
        this.confirmWipe = false;
      } else {
        this.confirmWipe = true;
      }
    }
    y += 50 * g;
    text(
      ctx,
      'kit, credits and every score card',
      safe.x,
      y,
      T.micro * g,
      C.textFaint,
    );
  }
}
