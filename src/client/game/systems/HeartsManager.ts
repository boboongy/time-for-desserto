import * as Phaser from 'phaser';

const MAX_HEARTS = 3;
const HEART_SPACING = 34;
const LOST_COLOR = '#5a4a52';
const FULL_COLOR = '#d9455f';

/**
 * The 3-heart fail state from GAME_DESIGN.md §7: lose a heart when a
 * customer's patience runs out, shift ends early once all are gone.
 */
export class HeartsManager {
  private hearts = MAX_HEARTS;
  private readonly heartTexts: Phaser.GameObjects.Text[];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.heartTexts = Array.from({ length: MAX_HEARTS }, (_, index) =>
      scene.add.text(x + index * HEART_SPACING, y, '♥', {
        fontFamily: 'Arial Black',
        fontSize: '28px',
        color: FULL_COLOR,
      })
    );
  }

  loseOne(): void {
    if (this.hearts <= 0) return;
    this.hearts -= 1;
    this.heartTexts[this.hearts]?.setColor(LOST_COLOR);
  }

  get remaining(): number {
    return this.hearts;
  }

  get isDead(): boolean {
    return this.hearts <= 0;
  }

  get lostAny(): boolean {
    return this.hearts < MAX_HEARTS;
  }
}
