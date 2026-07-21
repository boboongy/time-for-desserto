import { Scene } from 'phaser';
import { GAME_ASSETS, GAME_SOUNDS } from '../game/data/assets';

/**
 * Loads every sprite the game needs (see game/data/assets.ts) behind a
 * simple progress bar, then hands off to the Main Menu. Adding a sprite
 * means adding to that data file, not this scene.
 */
export class Preloader extends Scene {
  constructor() {
    super('Preloader');
  }

  init() {
    this.cameras.main.setBackgroundColor(0x2f2030);

    this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xf3e6c9);
    const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0xf3e6c9);

    this.load.on('progress', (progress: number) => {
      bar.width = 4 + 460 * progress;
    });
  }

  preload() {
    this.load.setPath('../assets');

    for (const [key, file] of Object.entries(GAME_ASSETS)) {
      this.load.image(key, file);
    }
    for (const [key, file] of Object.entries(GAME_SOUNDS)) {
      this.load.audio(key, file);
    }
  }

  create() {
    this.scene.start('MainMenu');
  }
}
