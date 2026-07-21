import * as Phaser from 'phaser';
import { SHIFT_DURATION_MS } from '../data/difficultyCurve';

const DOOR_WIDTH = 110;
const DOOR_HEIGHT = 165;

/**
 * The shop door: closed by default, opened for the duration a customer is
 * walking through it (see Customer.ts). The "open" texture reflects how far
 * into the shift we are — day for the first third, sunset for the middle
 * third, night for the last — a purely atmospheric touch tied to the same
 * shift clock everything else uses.
 */
export class Door {
  private readonly sprite: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.add.image(x, y, 'doorClosed').setDisplaySize(DOOR_WIDTH, DOOR_HEIGHT);
  }

  open(shiftElapsedMs: number): void {
    const t = shiftElapsedMs / SHIFT_DURATION_MS;
    const key = t < 1 / 3 ? 'doorOpenDay' : t < 2 / 3 ? 'doorOpenSunset' : 'doorOpenNight';
    this.sprite.setTexture(key);
  }

  close(): void {
    this.sprite.setTexture('doorClosed');
  }
}
