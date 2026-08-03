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
