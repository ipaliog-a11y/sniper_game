import { MenuScene } from './scenes/MenuScene';
import { App } from './ui/app';
import { audio } from './ui/audio';

const canvas = document.getElementById('stage') as HTMLCanvasElement | null;
const boot = document.getElementById('boot');
if (!canvas) throw new Error('No canvas to draw on.');

const app = new App(canvas);
audio.enabled = app.profile.settings.sound;

// Browsers hold the audio context shut until the user does something. The first
// touch anywhere opens it, and after that the game manages its own sound.
const unlock = (): void => {
  audio.unlock();
  window.removeEventListener('pointerdown', unlock);
};
window.addEventListener('pointerdown', unlock);

app.set(new MenuScene());
app.start();
boot?.remove();

/**
 * Register the service worker, which is what makes the game installable from
 * Chrome on Android and playable with no signal once it is. Only in a real
 * build — the dev server has no worker to serve.
 */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Resolved against the page so the same build works at a domain root or
    // under a project path.
    void navigator.serviceWorker.register(new URL('sw.js', window.location.href), {
      scope: './',
    });
  });
}
