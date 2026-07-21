import * as Phaser from 'phaser';
import type { FoodId } from '../../../shared/types';
import { RECIPES } from '../data/recipes';

type Slot = {
  foodId: FoodId;
  icon: Phaser.GameObjects.Image;
  countText: Phaser.GameObjects.Text;
  stock: number;
};

const SLOT_SPACING = 90;
const ICON_SIZE = 56;
const BOX_SIZE = 66;

/**
 * The row of finished-goods stock the player serves customers from.
 * OvenManager calls addStock() when a bake finishes; the Game scene calls
 * serve() when the player taps an order bubble.
 */
export class DisplayCase {
  private readonly slots: Slot[];

  constructor(
    private readonly scene: Phaser.Scene,
    centerX: number,
    y: number,
    foodIds: FoodId[]
  ) {
    const startX = centerX - ((foodIds.length - 1) * SLOT_SPACING) / 2;

    this.slots = foodIds.map((foodId, index) => {
      const x = startX + index * SLOT_SPACING;
      const recipe = RECIPES[foodId];

      // Always-visible slot behind the icon, so there's a clear "this is
      // where X goes" even before it's ever been baked (rather than relying
      // on the icon's own alpha alone to communicate that).
      scene.add.rectangle(x, y, BOX_SIZE, BOX_SIZE, 0xf3e6c9, 0.9).setStrokeStyle(3, 0x3b2417);

      const icon = scene.add
        .image(x, y, recipe.dessertTexture)
        .setDisplaySize(ICON_SIZE, ICON_SIZE)
        .setAlpha(0.4);

      const countText = scene.add
        .text(x, y + ICON_SIZE / 2 + 14, '0', {
          fontFamily: 'Arial Black',
          fontSize: '20px',
          color: '#3b2417',
        })
        .setOrigin(0.5);

      return { foodId, icon, countText, stock: 0 };
    });
  }

  addStock(foodId: FoodId): void {
    const slot = this.findSlot(foodId);
    const wasEmpty = slot.stock === 0;
    slot.stock += 1;
    this.refresh(slot);

    // A distinct "just got added" moment on the 0->1 transition, rather
    // than a silent alpha fade the player could easily miss.
    if (wasEmpty) {
      const baseScale = slot.icon.scale;
      this.scene.tweens.add({
        targets: slot.icon,
        scale: baseScale * 1.3,
        duration: 180,
        yoyo: true,
        ease: 'Back.easeOut',
        onComplete: () => slot.icon.setScale(baseScale),
      });
    }
  }

  /** Serves one unit if in stock. Returns false if the case is empty for that item. */
  serve(foodId: FoodId): boolean {
    const slot = this.findSlot(foodId);
    if (slot.stock <= 0) return false;
    slot.stock -= 1;
    this.refresh(slot);
    return true;
  }

  hasStock(foodId: FoodId): boolean {
    return this.findSlot(foodId).stock > 0;
  }

  private findSlot(foodId: FoodId): Slot {
    const slot = this.slots.find((candidate) => candidate.foodId === foodId);
    if (!slot) throw new Error(`DisplayCase has no slot for "${foodId}"`);
    return slot;
  }

  private refresh(slot: Slot): void {
    slot.countText.setText(String(slot.stock));
    slot.icon.setAlpha(slot.stock > 0 ? 1 : 0.4);
  }
}
