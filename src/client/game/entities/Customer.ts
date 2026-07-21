import * as Phaser from 'phaser';
import type { FoodId } from '../../../shared/types';
import { playClick } from '../systems/Audio';

const WALK_SPEED_PX_PER_SEC = 160;
const MIN_WALK_DURATION_MS = 200;
// On the way out, she steps this far up toward the counter (onto a row
// above where customers queue) before turning to walk back toward the
// door, so she doesn't cut through customers still queued at other slots
// along the counter row.
const EXIT_STEP_BACK_PX = 50;
const BAR_WIDTH = 90;
const BAR_HEIGHT = 8;
const BAR_COLOR = 0x6e9b5e;
const BAR_LOW_COLOR = 0xd9455f;

export type CustomerSpecies = 'yellowCat' | 'doggo' | 'monkey';
export const CUSTOMER_SPECIES: CustomerSpecies[] = ['yellowCat', 'doggo', 'monkey'];

type Direction = 'front' | 'back' | 'left' | 'right';

// Which walk-frame numbers actually exist per species/direction (a couple
// of the exported sets are missing frame 1 or frame 3 for one direction).
const WALK_FRAME_NUMBERS: Record<CustomerSpecies, Record<Direction, number[]>> = {
  yellowCat: { front: [2, 3, 4], back: [2, 3, 4], left: [2, 3, 4], right: [1, 2, 4] },
  doggo: { front: [2, 3, 4], back: [2, 3, 4], left: [2, 3, 4], right: [2, 3, 4] },
  monkey: { front: [2, 3, 4], back: [2, 3, 4], left: [2, 3, 4], right: [2, 3, 4] },
};

/**
 * A customer: walks in through the shop door, stands at the counter with an
 * order bubble and a draining patience bar, and either walks back out the
 * door happy (served) or unhappy (patience expired). Movement is two legs on
 * the way in — door-to-corner then corner-to-counter — and three legs on the
 * way out — a step back from the counter (facing back, as if turning to
 * leave), then corner, then door — rather than a single diagonal tween, so
 * she never visibly cuts through the counter furniture or other queued
 * customers. The animal-customer set (yellow cat, doggo, monkey) has no
 * angry or bag-carrying poses, so patience running out and a happy exit both
 * just reuse the ordinary idle/walk animations. The door itself is
 * opened/closed via callbacks (see Door.ts) rather than Customer knowing
 * anything about it directly.
 */
export class Customer {
  readonly foodIds: FoodId[];

  private readonly scene: Phaser.Scene;
  private readonly counterX: number;
  private readonly counterY: number;
  private readonly doorX: number;
  private readonly doorY: number;
  private readonly catSprite: Phaser.GameObjects.Sprite;
  private bubble: Phaser.GameObjects.Image | null = null;
  private patienceBarBg: Phaser.GameObjects.Rectangle | null = null;
  private patienceBar: Phaser.GameObjects.Rectangle | null = null;
  private patienceTween: Phaser.Tweens.Tween | null = null;
  private leaving = false;

  constructor(
    scene: Phaser.Scene,
    private readonly species: CustomerSpecies,
    doorX: number,
    doorY: number,
    counterX: number,
    counterY: number,
    foodIds: FoodId[],
    private readonly orderTexture: string,
    private readonly patienceMs: number,
    onOrderTapped: (customer: Customer) => void,
    private readonly onExpired: (customer: Customer) => void,
    private readonly openDoor: () => void,
    private readonly closeDoor: () => void
  ) {
    this.scene = scene;
    this.foodIds = foodIds;
    this.counterX = counterX;
    this.counterY = counterY;
    this.doorX = doorX;
    this.doorY = doorY;

    Customer.defineAnimations(scene, species);
    this.catSprite = scene.add.sprite(doorX, doorY, `${species}IdleFront`).setDisplaySize(96, 130);

    this.openDoor();
    this.walkPath([
      { x: doorX, y: counterY },
      { x: counterX, y: counterY },
    ], () => {
      this.closeDoor();
      this.catSprite.play(`${this.species}IdleFront`);
      this.showOrderBubble(onOrderTapped);
      this.startPatience();
    });
  }

  /** Fraction of patience time still remaining, 1 = just arrived, 0 = about to leave. */
  getPatienceRatioRemaining(): number {
    return this.patienceTween ? 1 - this.patienceTween.progress : 1;
  }

  /** Walks back out through the door (via the counter-row corner), then removes the customer. */
  leaveHappy(onComplete: () => void): void {
    if (this.leaving) return;
    this.leaving = true;
    this.patienceTween?.stop();
    this.hidePatienceBar();
    this.bubble?.setVisible(false);

    this.openDoor();
    this.walkExitPath(() => {
      this.closeDoor();
      this.destroy();
      onComplete();
    });
  }

  /** Briefly shakes the order bubble to signal "that item isn't ready yet." */
  shakeOutOfStock(): void {
    if (!this.bubble) return;
    this.scene.tweens.add({
      targets: this.bubble,
      x: this.bubble.x + 8,
      duration: 60,
      yoyo: true,
      repeat: 3,
    });
  }

  destroy(): void {
    this.catSprite.destroy();
    this.bubble?.destroy();
    this.hidePatienceBar();
  }

  private startPatience(): void {
    const barY = this.counterY - 165;
    this.patienceBarBg = this.scene.add.rectangle(this.counterX, barY, BAR_WIDTH, BAR_HEIGHT, 0x000000, 0.35);
    this.patienceBar = this.scene.add
      .rectangle(this.counterX - BAR_WIDTH / 2, barY, BAR_WIDTH, BAR_HEIGHT, BAR_COLOR)
      .setOrigin(0, 0.5);

    this.patienceTween = this.scene.tweens.add({
      targets: this.patienceBar,
      width: 0,
      duration: this.patienceMs,
      ease: 'Linear',
      onUpdate: () => {
        if (this.patienceBar && this.getPatienceRatioRemaining() < 0.3) {
          this.patienceBar.setFillStyle(BAR_LOW_COLOR);
        }
      },
      onComplete: () => this.leaveUnhappy(),
    });
  }

  private leaveUnhappy(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.hidePatienceBar();
    this.bubble?.setVisible(false);

    // A short beat so the player actually registers she's about to leave
    // before she turns to go (no dedicated angry pose for this character set).
    this.scene.time.delayedCall(400, () => {
      this.openDoor();
      this.walkExitPath(() => {
        this.closeDoor();
        this.destroy();
        this.onExpired(this);
      });
    });
  }

  private walkExitPath(onComplete: () => void): void {
    this.walkPath([
      { x: this.counterX, y: this.counterY - EXIT_STEP_BACK_PX, direction: 'back' },
      { x: this.doorX, y: this.counterY - EXIT_STEP_BACK_PX },
      { x: this.doorX, y: this.doorY },
    ], onComplete);
  }

  private hidePatienceBar(): void {
    this.patienceTween?.stop();
    this.patienceBarBg?.destroy();
    this.patienceBar?.destroy();
    this.patienceBarBg = null;
    this.patienceBar = null;
  }

  private showOrderBubble(onOrderTapped: (customer: Customer) => void): void {
    this.bubble = this.scene.add
      .image(this.counterX, this.counterY - 110, this.orderTexture)
      .setDisplaySize(110, 100)
      .setInteractive({ useHandCursor: true });

    this.bubble.on('pointerdown', () => {
      playClick(this.scene);
      onOrderTapped(this);
    });
  }

  /**
   * Walks through the given waypoints in order, playing the matching
   * directional animation for each leg. A waypoint can force a specific
   * facing (e.g. the exit's initial step-back, which moves toward the
   * camera but should still read as "turning back to leave").
   */
  private walkPath(waypoints: { x: number; y: number; direction?: Direction }[], onComplete: () => void): void {
    const [next, ...rest] = waypoints;
    if (!next) {
      onComplete();
      return;
    }

    const dx = next.x - this.catSprite.x;
    const dy = next.y - this.catSprite.y;
    const direction = next.direction ?? Customer.direction(dx, dy);
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || next.direction) {
      this.catSprite.play(`${this.species}Walk${capitalize(direction)}`, true);
    }

    const distance = Phaser.Math.Distance.Between(this.catSprite.x, this.catSprite.y, next.x, next.y);
    const duration = Math.max(MIN_WALK_DURATION_MS, (distance / WALK_SPEED_PX_PER_SEC) * 1000);

    this.scene.tweens.add({
      targets: this.catSprite,
      x: next.x,
      y: next.y,
      duration,
      ease: 'Sine.easeInOut',
      onComplete: () => this.walkPath(rest, onComplete),
    });
  }

  /** Picks the direction whose axis best matches the movement. */
  private static direction(dx: number, dy: number): Direction {
    if (Math.abs(dy) >= Math.abs(dx)) {
      return dy < 0 ? 'back' : 'front';
    }
    return dx < 0 ? 'left' : 'right';
  }

  private static defineAnimations(scene: Phaser.Scene, species: CustomerSpecies): void {
    const define = (key: string, frames: string[], frameRate: number) => {
      if (scene.anims.exists(key)) return;
      scene.anims.create({ key, frames: frames.map((textureKey) => ({ key: textureKey })), frameRate, repeat: -1 });
    };

    const directions: Direction[] = ['front', 'back', 'left', 'right'];
    for (const direction of directions) {
      const cap = capitalize(direction);
      const frameNumbers = WALK_FRAME_NUMBERS[species][direction];
      define(
        `${species}Walk${cap}`,
        frameNumbers.map((n) => `${species}Walk${cap}${n}`),
        7
      );
    }
    // A single-frame "animation" (rather than setTexture) so it actually
    // replaces whichever walk animation was previously looping — otherwise
    // the walk anim's next frame update would immediately overwrite a plain
    // setTexture call.
    define(`${species}IdleFront`, [`${species}IdleFront`], 1);
  }
}

function capitalize(direction: Direction): string {
  return direction[0]!.toUpperCase() + direction.slice(1);
}
