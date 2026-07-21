import * as Phaser from 'phaser';

// How long each phase of the mix animation holds before advancing to the next.
const DOUGH_IDLE_MS = 150;
const MIXING_MS = 480;
const MIXED_HOLD_MS = 200;
// A little rock back and forth while actively mixing, layered on top of the
// texture-state changes so it still reads as "in motion" not just a slideshow.
const MIXING_WOBBLE_DEG = 4;
const MIXING_WOBBLE_MS = 70;

/**
 * The stand mixer sprite and its two visual reactions. Game.ts owns the
 * actual "do the held ingredients match a recipe" decision (same split of
 * responsibility as OvenManager) — this class just knows how to look busy
 * mixing (stepping through empty -> dough dropped in -> mixing -> mixed ->
 * back to empty), or reject with a shake.
 */
export class StandMixerStation {
  readonly x: number;
  readonly y: number;

  private readonly sprite: Phaser.GameObjects.Image;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number
  ) {
    this.x = x;
    this.y = y;
    // Above the baker's own depth (5, see BakerController) so she reads as
    // standing behind/at the mixer rather than in front of it when she walks
    // up to use it.
    this.sprite = scene.add
      .image(x, y, 'mixerEmpty')
      .setDisplaySize(110, 130)
      .setDepth(6)
      .setInteractive({ useHandCursor: true });
  }

  onTap(handler: () => void): void {
    this.sprite.on('pointerdown', handler);
  }

  /** Steps through the mixer's dough-idle/mixing/mixed textures, then resets to empty. */
  playMixAnimation(onComplete: () => void): void {
    this.sprite.setTexture('mixerDoughIdle');

    this.scene.time.delayedCall(DOUGH_IDLE_MS, () => {
      this.sprite.setTexture('mixerMixing');
      this.scene.tweens.add({
        targets: this.sprite,
        angle: MIXING_WOBBLE_DEG,
        duration: MIXING_WOBBLE_MS,
        yoyo: true,
        repeat: Math.round(MIXING_MS / MIXING_WOBBLE_MS),
      });

      this.scene.time.delayedCall(MIXING_MS, () => {
        this.sprite.setAngle(0);
        this.sprite.setTexture('mixerMixed');

        this.scene.time.delayedCall(MIXED_HOLD_MS, () => {
          this.sprite.setTexture('mixerEmpty');
          onComplete();
        });
      });
    });
  }

  shakeReject(): void {
    this.scene.tweens.add({
      targets: this.sprite,
      x: this.x + 6,
      duration: 50,
      yoyo: true,
      repeat: 3,
    });
  }
}
