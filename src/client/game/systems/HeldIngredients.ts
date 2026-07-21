import * as Phaser from 'phaser';
import type { IngredientId } from '../../../shared/types';
import { INGREDIENT_TEXTURE } from '../data/assets';

const ICON_SIZE = 40;
const ICON_SPACING = 46;
const MAX_HELD = 4;

/**
 * The ingredients the baker is currently carrying, collected one at a time
 * by walking to shelves (see BakerController). Shown as a fixed HUD row so
 * it's readable regardless of where she currently is in the shop.
 */
export class HeldIngredients {
  private held: IngredientId[] = [];
  private readonly icons: Phaser.GameObjects.Image[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly originX: number,
    private readonly originY: number
  ) {}

  isFull(): boolean {
    return this.held.length >= MAX_HELD;
  }

  getHeld(): IngredientId[] {
    return [...this.held];
  }

  add(ingredientId: IngredientId): void {
    if (this.isFull()) return;

    this.held.push(ingredientId);
    const index = this.held.length - 1;
    const icon = this.scene.add
      .image(this.originX + index * ICON_SPACING, this.originY, INGREDIENT_TEXTURE[ingredientId])
      .setDisplaySize(ICON_SIZE, ICON_SIZE);
    this.icons.push(icon);
  }

  clear(): void {
    this.held = [];
    this.icons.forEach((icon) => icon.destroy());
    this.icons.length = 0;
  }
}
