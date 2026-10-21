// Imported first on purpose: it installs the failure screen before the rest of
// the module graph evaluates, so a module that throws on load is still
// reported rather than silently leaving the loading card up.
import { hardReset, installFailureHandlers, showFailure } from './boot/failure';
import { MenuScene } from './scenes/MenuScene';
import { App } from './ui/app';
import { audio } from './ui/audio';

installFailureHandlers();

/**
 * Escape hatch. `?reset` clears the service worker, the caches and the saved
 * profile before anything else runs — the one thing that reliably rescues an
 * installed copy that cached a bad build and will not start.
 */
if (new URLSearchParams(window.location.search).has('reset')) {
  void hardReset().then(() => {
    window.location.replace(window.location.pathname);
  });
} else {
  start();
}

function start(): void {
  try {
    const canvas = document.getElementById('stage') as HTMLCanvasElement | null;
    if (!canvas) throw new Error('The page has no canvas to draw on.');

    const app = new App(canvas);
    app.onCrash = (error) => showFailure(error, 'running');
    audio.applySettings(app.profile.settings);

    // Browsers hold the audio context shut until the user does something. The
    // first touch anywhere opens it, and after that the game manages its own
    // sound.
    const unlock = (): void => {
      audio.unlock();
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('pointerdown', unlock);

    app.set(new MenuScene());
    app.start();
    document.getElementById('boot')?.remove();

    /**
     * Register the service worker, which is what makes the game installable
     * from Chrome on Android and playable with no signal once it is. Only in a
     * real build — the dev server has no worker to serve. A failure here must
     * never take the game down with it: no offline copy is a far smaller
     * problem than no game.
     */
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        // Resolved against the page so the same build works at a domain root
        // or under a project path.
        navigator.serviceWorker
          .register(new URL('sw.js', window.location.href), { scope: './' })
          .catch(() => undefined);
      });
    }
  } catch (error) {
    showFailure(error, 'boot');
  }
}
