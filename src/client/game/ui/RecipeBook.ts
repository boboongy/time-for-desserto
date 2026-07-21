import * as Phaser from 'phaser';
import { ALL_FOOD_IDS, RECIPES } from '../data/recipes';
import { INGREDIENT_TEXTURE } from '../data/assets';
import { playClick } from '../systems/Audio';

const ROW_START_Y = 228;
const ROW_SPACING = 62;
// Shifted right from the frame's own left edge (its decorative border eats
// into the interior, same reasoning as ROW_START_Y clearing the top border).
const DESSERT_X = 270;
const EQUALS_X = 310;
const INGREDIENTS_START_X = 350;
const INGREDIENT_STEP_X = 46;
const PLUS_STEP_X = 30;
// Guards against the same physical tap that opens the book (e.g. the
// MainMenu "tap to start" press) also landing on the close button in the
// same instant — ignore taps on it for a brief moment after showing.
const CLOSE_BUTTON_ARM_DELAY_MS = 400;

/**
 * A recipe reference: which ingredients make each dessert. Shown once
 * before the first shift (so the player isn't guessing), and reopenable
 * any time via a corner button — both share this one component, and Game.ts
 * pauses the shift clock/spawns for as long as it's open.
 */
export class RecipeBook {
  private readonly container: Phaser.GameObjects.Container;
  private readonly closeButtonText: Phaser.GameObjects.Text;
  private readonly hintText: Phaser.GameObjects.Text;
  private closeButtonArmed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onClose: () => void
  ) {
    const children: Phaser.GameObjects.GameObject[] = [];

    const backdrop = scene.add.rectangle(512, 384, 1024, 768, 0x000000, 0.6).setInteractive();
    // Sized to fit the content (rather than the frame's own tall, narrow
    // native aspect ratio) since each recipe row is wider than it is tall.
    const panel = scene.add.image(512, 384, 'recipeBookPanel').setDisplaySize(720, 560);
    // Sits above the frame's own top border (in the dark backdrop area),
    // not inside its cream interior, so it keeps the light-on-dark styling.
    const title = scene.add
      .text(512, 130, 'Recipe Book', {
        fontFamily: 'Arial Black',
        fontSize: '30px',
        color: '#f3e6c9',
        stroke: '#3b2417',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    children.push(backdrop, panel, title);

    ALL_FOOD_IDS.forEach((foodId, index) => {
      const recipe = RECIPES[foodId];
      const y = ROW_START_Y + index * ROW_SPACING;

      children.push(
        scene.add.image(DESSERT_X, y, recipe.dessertTexture).setDisplaySize(48, 48),
        scene.add
          .text(EQUALS_X, y, '=', { fontFamily: 'Arial Black', fontSize: '22px', color: '#3b2417' })
          .setOrigin(0.5),
        scene.add
          .text(EQUALS_X + 130, y - 22, recipe.name, {
            fontFamily: 'Arial',
            fontSize: '13px',
            color: '#e3a857',
          })
          .setOrigin(0, 1)
      );

      let x = INGREDIENTS_START_X;
      recipe.ingredients.forEach((ingredientId, ingredientIndex) => {
        if (ingredientIndex > 0) {
          children.push(
            scene.add
              .text(x, y, '+', { fontFamily: 'Arial Black', fontSize: '20px', color: '#3b2417' })
              .setOrigin(0.5)
          );
          x += PLUS_STEP_X;
        }
        children.push(scene.add.image(x, y, INGREDIENT_TEXTURE[ingredientId]).setDisplaySize(36, 36));
        x += INGREDIENT_STEP_X;
      });
    });

    // Sits below the frame's own bottom border (dark backdrop area, hence
    // this and closeButtonText's light-on-dark colors), same reasoning as
    // the title above the frame's top border.
    this.hintText = scene.add
      .text(512, 690, '', {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: '#e3a857',
      })
      .setOrigin(0.5)
      .setVisible(false);
    children.push(this.hintText);

    this.closeButtonText = scene.add
      .text(512, 730, '', {
        fontFamily: 'Arial Black',
        fontSize: '24px',
        color: '#d9455f',
        stroke: '#3b2417',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.closeButtonText.on('pointerdown', () => {
      if (!this.closeButtonArmed) return;
      playClick(this.scene);
      this.hide();
    });
    children.push(this.closeButtonText);

    this.container = scene.add.container(0, 0, children).setDepth(1000);
  }

  /** hintText only makes sense on the pre-shift showing — reopening mid-shift via the corner button omits it. */
  show(closeLabel: string, hintText?: string): void {
    this.closeButtonText.setText(closeLabel);
    this.hintText.setText(hintText ?? '').setVisible(!!hintText);
    this.container.setVisible(true);

    this.closeButtonArmed = false;
    this.scene.time.delayedCall(CLOSE_BUTTON_ARM_DELAY_MS, () => {
      this.closeButtonArmed = true;
    });
  }

  private hide(): void {
    this.container.setVisible(false);
    this.onClose();
  }
}
