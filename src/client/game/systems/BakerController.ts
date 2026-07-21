import * as Phaser from 'phaser';

const WALK_SPEED_PX_PER_SEC = 220;
const MIN_WALK_DURATION_MS = 150;

type Direction = 'front' | 'left' | 'right';

/**
 * Walk-to-target movement for the baker (a chef wolf): tapping a shelf or
 * station calls moveTo(), and the actual interaction happens once she
 * arrives. She only ever strafes left/right — her vertical position never
 * changes after spawning at home, so she can't walk toward/away from the
 * counter and cut across the illustrated shelf/counter furniture. The `y`
 * argument some callers still pass is ignored; kept so Game.ts's per-station
 * call sites (which used to mean "walk to this vertical reach line") don't
 * all need rewriting.
 */
export class BakerController {
  readonly sprite: Phaser.GameObjects.Sprite;

  private moveTween: Phaser.Tweens.Tween | null = null;
  private facing: Direction = 'front';

  constructor(
    private readonly scene: Phaser.Scene,
    homeX: number,
    homeY: number
  ) {
    this.defineAnimations();

    // Depth above the stations/shelf (all default depth 0) so walking up to
    // one never gets her fully hidden behind its sprite.
    this.sprite = scene.add.sprite(homeX, homeY, 'wolfIdleFront').setDisplaySize(110, 150).setDepth(5);
  }

  /** Strafes to x (her y never changes), calling onArrive once there. A new call redirects immediately. */
  moveTo(x: number, _y: number, onArrive: () => void): void {
    this.moveTween?.stop();

    const dx = x - this.sprite.x;
    if (Math.abs(dx) > 4) {
      this.facing = dx < 0 ? 'left' : 'right';
      this.sprite.play(`wolfWalk${capitalize(this.facing)}`, true);
    }

    const duration = Math.max(MIN_WALK_DURATION_MS, (Math.abs(dx) / WALK_SPEED_PX_PER_SEC) * 1000);

    this.moveTween = this.scene.tweens.add({
      targets: this.sprite,
      x,
      duration,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.moveTween = null;
        this.sprite.play(`wolfIdle${capitalize(this.facing)}`);
        onArrive();
      },
    });
  }

  private defineAnimations(): void {
    const define = (key: string, frames: string[], frameRate: number) => {
      if (this.scene.anims.exists(key)) return;
      this.scene.anims.create({ key, frames: frames.map((textureKey) => ({ key: textureKey })), frameRate, repeat: -1 });
    };
    const defineIdle = (key: string, textureKey: string) => {
      if (this.scene.anims.exists(key)) return;
      this.scene.anims.create({ key, frames: [{ key: textureKey }], frameRate: 1, repeat: -1 });
    };

    define('wolfWalkLeft', ['wolfWalkLeft2', 'wolfWalkLeft3', 'wolfWalkLeft4'], 7);
    define('wolfWalkRight', ['wolfWalkRight2', 'wolfWalkRight3', 'wolfWalkRight4'], 7);

    defineIdle('wolfIdleFront', 'wolfIdleFront');
    defineIdle('wolfIdleLeft', 'wolfIdleLeft');
    defineIdle('wolfIdleRight', 'wolfIdleRight');
  }
}

function capitalize(direction: Direction): string {
  return direction[0]!.toUpperCase() + direction.slice(1);
}
