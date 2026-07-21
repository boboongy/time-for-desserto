import * as Phaser from 'phaser';
import type { FoodId } from '../../../shared/types';
import { RECIPES } from '../data/recipes';

type OvenState = 'idle' | 'baking' | 'done' | 'broken' | 'fixing';

const BAR_WIDTH = 90;
const BAR_HEIGHT = 10;

const MAX_HEAT = 100;
const HEAT_PER_BAKE = 40;
const HEAT_DECAY_PER_SEC = 8;
const FIX_DURATION_MS = 2500;
// Every recipe's bakeTimeMs is comfortably longer than this, so there's
// always a real "baking" phase left after the preheat visual.
const PREHEAT_MS = 800;

/**
 * A single-slot oven: one item bakes at a time, matching the "one oven,
 * one item" bottleneck from GAME_DESIGN.md §2. Game.ts feeds it a FoodId
 * either by dragging a mixed dough onto it or by tapping the oven directly
 * (which auto-consumes any dough currently sitting at the mixer).
 *
 * Baking heats the oven up; push it too far without a break and it breaks
 * (GAME_DESIGN.md §5 "Oven overheat") — tapping it again while broken
 * starts a short fix, after which it's back to idle with heat cleared.
 */
export class OvenManager {
  readonly x: number;
  readonly y: number;

  private state: OvenState = 'idle';
  private bakingFoodId: FoodId | null = null;
  private elapsedMs = 0;
  private heat = 0;
  private fixElapsedMs = 0;

  private readonly sprite: Phaser.GameObjects.Image;
  private readonly progressBarBg: Phaser.GameObjects.Rectangle;
  private readonly progressBar: Phaser.GameObjects.Rectangle;
  private doneHandler: (() => void) | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    width = 120,
    height = 135
  ) {
    this.x = x;
    this.y = y;

    this.sprite = scene.add
      .image(x, y, 'ovenEmpty')
      .setDisplaySize(width, height)
      .setInteractive({ useHandCursor: true });

    // Scales with the sprite's own height so the bar always clears its top
    // edge by the same margin, regardless of how big this particular oven is.
    const barY = y - height / 2 - 15;
    this.progressBarBg = scene.add
      .rectangle(x, barY, BAR_WIDTH, BAR_HEIGHT, 0x000000, 0.35)
      .setVisible(false);
    this.progressBar = scene.add
      .rectangle(x - BAR_WIDTH / 2, barY, 0, BAR_HEIGHT, 0xe3a857)
      .setOrigin(0, 0.5)
      .setVisible(false);
  }

  get isBusy(): boolean {
    return this.state !== 'idle';
  }

  get isBroken(): boolean {
    return this.state === 'broken';
  }

  get isDone(): boolean {
    return this.state === 'done';
  }

  /** Registers the handler for tapping the oven itself (attempt to bake / collect / fix). */
  onTap(handler: () => void): void {
    this.sprite.on('pointerdown', handler);
  }

  /** Fires once at the exact moment a bake finishes (state -> 'done'), e.g. for a ding sound. */
  onDone(handler: () => void): void {
    this.doneHandler = handler;
  }

  /** Visual "nope" feedback for an empty or non-matching ingredient set. */
  shakeReject(): void {
    this.scene.tweens.add({
      targets: this.sprite,
      x: this.sprite.x + 6,
      duration: 50,
      yoyo: true,
      repeat: 3,
    });
  }

  /**
   * Starts baking if the oven is free and not too hot. Returns false if
   * it's busy, or if this bake would push it past MAX_HEAT — in which case
   * it breaks instead (see isBroken).
   */
  startBake(foodId: FoodId): boolean {
    if (this.state !== 'idle') return false;

    if (this.heat + HEAT_PER_BAKE > MAX_HEAT) {
      this.state = 'broken';
      this.sprite.setTexture('ovenBroken');
      return false;
    }

    this.heat += HEAT_PER_BAKE;
    this.state = 'baking';
    this.bakingFoodId = foodId;
    this.elapsedMs = 0;

    this.sprite.setTexture('ovenPreheating');
    this.progressBarBg.setVisible(true);
    this.progressBar.setVisible(true).setSize(0, BAR_HEIGHT);
    return true;
  }

  /** Starts repairing a broken oven. Returns false if it wasn't broken (or already being fixed). */
  tryFix(): boolean {
    if (this.state !== 'broken') return false;

    this.state = 'fixing';
    this.fixElapsedMs = 0;
    this.progressBarBg.setVisible(true);
    this.progressBar.setVisible(true).setSize(0, BAR_HEIGHT);
    return true;
  }

  update(deltaMs: number): void {
    if (this.state === 'baking' && this.bakingFoodId !== null) {
      this.elapsedMs += deltaMs;

      if (this.elapsedMs >= PREHEAT_MS && this.sprite.texture.key === 'ovenPreheating') {
        this.sprite.setTexture('ovenBaking');
      }

      const recipe = RECIPES[this.bakingFoodId];
      const progress = Phaser.Math.Clamp(this.elapsedMs / recipe.bakeTimeMs, 0, 1);
      this.progressBar.setSize(BAR_WIDTH * progress, BAR_HEIGHT);

      if (progress >= 1) {
        this.state = 'done';
        this.sprite.setTexture('ovenReady');
        this.progressBarBg.setVisible(false);
        this.progressBar.setVisible(false);
        this.doneHandler?.();
      }
      return;
    }

    if (this.state === 'fixing') {
      this.fixElapsedMs += deltaMs;
      const progress = Phaser.Math.Clamp(this.fixElapsedMs / FIX_DURATION_MS, 0, 1);
      this.progressBar.setSize(BAR_WIDTH * progress, BAR_HEIGHT);

      if (progress >= 1) {
        this.state = 'idle';
        this.heat = 0;
        this.sprite.setTexture('ovenEmpty');
        this.progressBarBg.setVisible(false);
        this.progressBar.setVisible(false);
      }
      return;
    }

    // Cools down whenever it isn't actively baking or being fixed.
    if (this.heat > 0) {
      this.heat = Math.max(0, this.heat - (HEAT_DECAY_PER_SEC * deltaMs) / 1000);
    }
  }

  /** Collects the finished item, if any, and resets the oven to idle. */
  collect(): FoodId | null {
    if (this.state !== 'done' || this.bakingFoodId === null) return null;

    const foodId = this.bakingFoodId;
    this.state = 'idle';
    this.bakingFoodId = null;
    this.sprite.setTexture('ovenEmpty');
    return foodId;
  }
}
