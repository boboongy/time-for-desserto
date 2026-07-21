import { Scene } from 'phaser';

/**
 * The very first scene Phaser runs. Kept empty on purpose — the real
 * loading (all the bakery art) happens in Preloader, which shows its own
 * progress bar, so Boot has nothing to display and just hands off.
 */
export class Boot extends Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.scene.start('Preloader');
  }
}
