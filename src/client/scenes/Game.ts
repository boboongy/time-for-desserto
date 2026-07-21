import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import type { FoodId, IngredientId } from '../../shared/types';
import type { GameMode, ShiftOutcome, SubmitScoreRequest, SubmitScoreResponse } from '../../shared/gameApi';
import { ALL_FOOD_IDS, RECIPES, matchRecipe } from '../game/data/recipes';
import { INGREDIENT_TEXTURE } from '../game/data/assets';
import { SHIFT_DURATION_MS } from '../game/data/difficultyCurve';
import { submitScore as submitScoreLocally } from '../game/data/highScore';
import { loadDailySeed } from '../game/data/dailySeed';
import { DisplayCase } from '../game/systems/DisplayCase';
import { OvenManager } from '../game/systems/OvenManager';
import { BakerController } from '../game/systems/BakerController';
import { HeldIngredients } from '../game/systems/HeldIngredients';
import { StandMixerStation } from '../game/systems/StandMixerStation';
import { OrderManager } from '../game/systems/OrderManager';
import { HeartsManager } from '../game/systems/HeartsManager';
import { ScoreManager } from '../game/systems/ScoreManager';
import { Door } from '../game/systems/Door';
import { Customer } from '../game/entities/Customer';
import { RecipeBook } from '../game/ui/RecipeBook';
import { ensureBgmPlaying, playClick, playMixerStart, playOvenDing, playOvenStart } from '../game/systems/Audio';

// Rush Hour (the skill-gated unlock) reuses this same scene with every
// spawn-interval/patience value scaled down by this factor, rather than
// being a separate mode built from scratch.
const RUSH_HOUR_DIFFICULTY_MULTIPLIER = 0.65;

// Fixed 1024x768 layout — see GAME_DESIGN.md §10, no camera scrolling. The
// backdrop is one fully-illustrated scene (counter, shelving, register,
// plants all baked in), so unlike the old tile-based layout there's no
// separate wall/counter/floor band — everything else is positioned to sit
// naturally against whatever's already drawn there.
const DOOR = { x: 200, y: 260 };
const COUNTER_ROW_Y = 420;
// Bottom-centered, below the customer row — see CUSTOMER_ROW_Y below, which
// was shifted up to keep the two from overlapping.
const DISPLAY_CASE = { x: 512, y: 705 };
const CUSTOMER_ROW_Y = 630;

const COUNTER_SLOTS = [
  { x: 280, y: CUSTOMER_ROW_Y },
  { x: 512, y: CUSTOMER_ROW_Y },
  { x: 744, y: CUSTOMER_ROW_Y },
];
// Set back from the counter row proper so she reads as standing behind the
// display case rather than on top of it.
const BAKER_HOME = { x: 512, y: COUNTER_ROW_Y - 82 };
const MIXER = { x: 630, y: COUNTER_ROW_Y-40 };
const PREP_TABLE = { x: 750, y: COUNTER_ROW_Y };
// Two ovens now (see buildBakeStations) so baking isn't a strict one-at-a-
// time bottleneck — set into the empty two-tier shelf on the right of the
// backdrop (measured from the backdrop art: the shelf's open interior spans
// roughly x 845-999, upper compartment y 145-223, lower y 267-335). Kept at
// the original larger size, so they overhang the compartment opening a bit.
const OVEN = { x: 915, y: 184, width: 120, height: 135 };
const OVEN2 = { x: 915, y: 301, width: 120, height: 135 };
// Where she actually stops for the mixer/oven — a step in front of each
// appliance's own center so her sprite doesn't land dead-center on top of
// it (the two are similar sizes and would otherwise fully overlap).
const MIXER_REACH_Y = MIXER.y+22 ;
const OVEN_REACH_Y = OVEN.y + 22;
const OVEN2_REACH_Y = OVEN2.y + 22;
// Both ovens share the same x, and she only ever strafes (never walks
// vertically) — without this she'd stop dead-center under whichever oven,
// fully covering its door. Standing here instead keeps her clear of both.
const OVEN_APPROACH_X = OVEN.x - 130;
const HELD_HUD = { x: 20, y: 72 };
const HEARTS_HUD = { x: 850, y: 20 };
const RECIPE_BUTTON = { x: 960, y: 730 };

// A single evenly-spaced row on the empty shelf behind the baker (the
// backdrop's blank shelf band spans roughly x:368-847, y:142-220).
// Raised from the shelf's own bread row (measured on the rendered backdrop:
// the loaves/rolls start around y=228) and evenly spaced across the shelf's
// actual open interior (x roughly 357-795, between its left post and the
// post separating it from the oven cabinet) — the old row sat low enough to
// crowd that bread, and chocolate (the rightmost item) hung over the post.
const SHELF_ROW_Y = 183;
// How close she actually walks to grab an ingredient — short of the shelf's
// own row so she doesn't step into its illustrated depth, just reaches up.
const SHELF_REACH_Y = 30;
const SHELF_INGREDIENTS: { id: IngredientId; x: number; y: number }[] = [
  { id: 'flour', x: 382, y: SHELF_ROW_Y },
  { id: 'butter', x: 443, y: SHELF_ROW_Y },
  { id: 'milk', x: 505, y: SHELF_ROW_Y },
  { id: 'berries', x: 566, y: SHELF_ROW_Y },
  { id: 'eggs', x: 627, y: SHELF_ROW_Y },
  { id: 'sugar', x: 689, y: SHELF_ROW_Y },
  { id: 'chocolate', x: 750, y: SHELF_ROW_Y },
];

/**
 * The full shift: 3 counter slots, all 6 recipes, a difficulty ramp, combo
 * orders, oven overheat, and the 3-heart fail state. Also doubles as Rush
 * Hour mode (see RUSH_HOUR_DIFFICULTY_MULTIPLIER above) when started with
 * `{ mode: 'rush_hour' }`. See SPEC.md §3 for the scope this covers.
 */
export class Game extends Scene {
  private ovens!: OvenManager[];
  private orderManager!: OrderManager;
  private hearts!: HeartsManager;
  private score!: ScoreManager;
  private door!: Door;
  private hudText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private shiftElapsedMs = 0;
  private shiftEnded = false;
  private servedCount = 0;
  private isPaused = false;
  private mode: GameMode = 'normal';

  constructor() {
    super('Game');
  }

  init(data?: { mode?: GameMode }) {
    this.mode = data?.mode ?? 'normal';
  }

  create() {
    this.shiftElapsedMs = 0;
    this.shiftEnded = false;
    this.servedCount = 0;
    this.isPaused = false;

    ensureBgmPlaying(this);
    void loadDailySeed();
    this.buildBackground();
    this.door = new Door(this, DOOR.x, DOOR.y);

    const displayCase = new DisplayCase(this, DISPLAY_CASE.x, DISPLAY_CASE.y, ALL_FOOD_IDS);
    const baker = new BakerController(this, BAKER_HOME.x, BAKER_HOME.y);
    const held = new HeldIngredients(this, HELD_HUD.x + 90, HELD_HUD.y);
    this.hearts = new HeartsManager(this, HEARTS_HUD.x, HEARTS_HUD.y);
    this.score = new ScoreManager();

    this.buildShelves(baker, held);
    this.buildBakeStations(baker, held, displayCase);
    this.buildHud();

    const handleOrderTapped = (customer: Customer): void => {
      const inStock = customer.foodIds.every((foodId) => displayCase.hasStock(foodId));
      if (!inStock) {
        customer.shakeOutOfStock();
        return;
      }

      const patienceRatio = customer.getPatienceRatioRemaining();
      customer.foodIds.forEach((foodId) => displayCase.serve(foodId));

      const basePoints = customer.foodIds.reduce((sum, foodId) => sum + RECIPES[foodId].points, 0);
      this.score.registerServe(basePoints, patienceRatio);
      this.servedCount += 1;
      this.orderManager.notifyServed();
      this.refreshHud();

      customer.leaveHappy(() => this.orderManager.release(customer));
    };

    const handleExpired = (customer: Customer): void => {
      this.orderManager.release(customer);
      this.hearts.loseOne();
      this.score.registerMiss();
      this.refreshHud();

      if (this.hearts.isDead) void this.endShift('closed_early');
    };

    const difficultyMultiplier = this.mode === 'rush_hour' ? RUSH_HOUR_DIFFICULTY_MULTIPLIER : 1;
    // Rush Hour is for players who've already cleared normal mode, so it
    // starts fully unlocked; normal mode eases in with 2 of the 3 slots.
    const startingActiveSlots = this.mode === 'rush_hour' ? COUNTER_SLOTS.length : 2;
    this.orderManager = new OrderManager(
      this,
      COUNTER_SLOTS,
      DOOR,
      {
        onOrderTapped: handleOrderTapped,
        onExpired: handleExpired,
        onDoorOpen: () => this.door.open(this.shiftElapsedMs),
        onDoorClose: () => this.door.close(),
      },
      difficultyMultiplier,
      startingActiveSlots
    );

    this.buildRecipeBook();
  }

  /** The recipe reference: shown once before the shift starts, reopenable via the corner button. */
  private buildRecipeBook(): void {
    const buttonBg = this.add
      .rectangle(RECIPE_BUTTON.x, RECIPE_BUTTON.y, 110, 40, 0x3b2417, 0.85)
      .setStrokeStyle(2, 0xf3e6c9)
      .setInteractive({ useHandCursor: true });
    const buttonLabel = this.add
      .text(RECIPE_BUTTON.x, RECIPE_BUTTON.y, 'Recipes', {
        fontFamily: 'Arial Black',
        fontSize: '16px',
        color: '#f3e6c9',
      })
      .setOrigin(0.5);

    const setButtonVisible = (visible: boolean): void => {
      buttonBg.setVisible(visible);
      buttonLabel.setVisible(visible);
    };

    const recipeBook = new RecipeBook(this, () => {
      this.isPaused = false;
      setButtonVisible(true);
    });

    const openBook = (): void => {
      playClick(this);
      this.isPaused = true;
      setButtonVisible(false);
      recipeBook.show('Close');
    };

    buttonBg.on('pointerdown', openBook);
    buttonLabel.setInteractive({ useHandCursor: true }).on('pointerdown', openBook);

    // Force the player to look at it once before the clock starts.
    this.isPaused = true;
    setButtonVisible(false);
    recipeBook.show('Start Shift', 'Tap ingredients on the shelf, then the mixer, then the oven — then tap the order to serve!');
  }

  override update(_time: number, delta: number): void {
    if (this.shiftEnded || this.isPaused) return;

    this.ovens.forEach((oven) => oven.update(delta));
    this.shiftElapsedMs += delta;
    this.orderManager.update(delta, this.shiftElapsedMs);
    this.refreshTimer();

    if (this.shiftElapsedMs >= SHIFT_DURATION_MS) void this.endShift('complete');
  }

  /**
   * Submits the score to the server (daily leaderboard + flair/unlock
   * checks all happen there — see src/server/routes/game.ts). Falls back
   * to the local-only high score if there's no server to reach, so the
   * result screen still works when testing outside Devvit.
   */
  private async endShift(outcome: ShiftOutcome): Promise<void> {
    if (this.shiftEnded) return;
    this.shiftEnded = true;

    const perfectDay = outcome === 'complete' && !this.hearts.lostAny;
    const result = await this.submitScore(outcome);

    this.scene.start('GameOver', {
      outcome,
      perfectDay,
      score: this.score.score,
      served: this.servedCount,
      ...result,
    });
  }

  /** Submits to the server; falls back to the local-only high score if there's no server to reach. */
  private async submitScore(outcome: ShiftOutcome): Promise<SubmitScoreResponse> {
    try {
      const request: SubmitScoreRequest = {
        score: this.score.score,
        served: this.servedCount,
        outcome,
        mode: this.mode,
      };
      const response = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!response.ok) throw new Error(`score submit failed: ${response.status}`);

      return (await response.json()) as SubmitScoreResponse;
    } catch {
      const local = submitScoreLocally(this.score.score);
      return {
        rank: 0,
        totalPlayers: 0,
        isNewBest: local.isNewBest,
        bestScore: local.bestScore,
        rushHourUnlocked: false,
        masterBakerAwarded: false,
      };
    }
  }

  /** Wires the mixer + ovens + drag-the-dough loop. See GAME_DESIGN.md §2/§5. */
  private buildBakeStations(baker: BakerController, held: HeldIngredients, displayCase: DisplayCase): void {
    // Two ovens so baking isn't a strict one-at-a-time bottleneck — either
    // can take the current dough, so the player can have both going at once.
    const ovenSetups = [
      { manager: new OvenManager(this, OVEN.x, OVEN.y, OVEN.width, OVEN.height), pos: OVEN, reachY: OVEN_REACH_Y },
      { manager: new OvenManager(this, OVEN2.x, OVEN2.y, OVEN2.width, OVEN2.height), pos: OVEN2, reachY: OVEN2_REACH_Y },
    ];
    this.ovens = ovenSetups.map((setup) => setup.manager);
    this.ovens.forEach((oven) => oven.onDone(() => playOvenDing(this)));
    const ovenDropZones = ovenSetups.map((setup) => ({
      manager: setup.manager,
      zone: new Phaser.Geom.Rectangle(
        setup.pos.x - setup.pos.width / 2 - 20,
        setup.pos.y - setup.pos.height / 2 - 20,
        setup.pos.width + 40,
        setup.pos.height + 40
      ),
    }));

    let currentDough: { foodId: FoodId; sprite: Phaser.GameObjects.Image } | null = null;

    const spawnDough = (foodId: FoodId): void => {
      // Same depth reasoning as the mixer sprite — sits in front of the
      // baker rather than getting drawn over by her when she's standing
      // right at the prep table.
      const sprite = this.add
        .image(PREP_TABLE.x, PREP_TABLE.y - 15, 'doughBowl')
        .setDisplaySize(100, 78)
        .setDepth(6)
        .setInteractive({ useHandCursor: true });
      this.input.setDraggable(sprite);

      sprite.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        sprite.setPosition(dragX, dragY);
      });

      sprite.on('dragend', () => {
        const target = ovenDropZones.find(({ zone }) => zone.contains(sprite.x, sprite.y));
        if (target && target.manager.startBake(foodId)) {
          sprite.destroy();
          currentDough = null;
        } else if (target?.manager.isBroken) {
          // The bake attempt itself broke the oven — the dough's ruined.
          sprite.destroy();
          currentDough = null;
        } else {
          this.tweens.add({ targets: sprite, x: PREP_TABLE.x, y: PREP_TABLE.y - 15, duration: 150 });
        }
      });

      currentDough = { foodId, sprite };
    };

    ovenSetups.forEach(({ manager: oven, reachY }) => {
      oven.onTap(() => {
        playClick(this);

        if (oven.isBroken) {
          baker.moveTo(OVEN_APPROACH_X, reachY, () => oven.tryFix());
          return;
        }

        if (oven.isDone) {
          baker.moveTo(OVEN_APPROACH_X, reachY, () => {
            const collected = oven.collect();
            if (collected) displayCase.addStock(collected);
          });
          return;
        }
        if (oven.isBusy) return;

        if (currentDough) {
          const dough = currentDough;
          baker.moveTo(OVEN_APPROACH_X, reachY, () => {
            const started = oven.startBake(dough.foodId);
            if (started) playOvenStart(this);
            if (started || oven.isBroken) {
              dough.sprite.destroy();
              currentDough = null;
            }
          });
        } else {
          oven.shakeReject();
        }
      });
    });

    const mixer = new StandMixerStation(this, MIXER.x, MIXER.y);
    mixer.onTap(() => {
      playClick(this);

      if (currentDough) {
        mixer.shakeReject();
        return;
      }

      const match = matchRecipe(held.getHeld(), ALL_FOOD_IDS);
      if (!match) {
        mixer.shakeReject();
        held.clear();
        return;
      }

      baker.moveTo(mixer.x, MIXER_REACH_Y, () => {
        playMixerStart(this);
        mixer.playMixAnimation(() => {
          held.clear();
          spawnDough(match);
        });
      });
    });
  }

  private buildShelves(baker: BakerController, held: HeldIngredients): void {
    SHELF_INGREDIENTS.forEach(({ id, x, y }) => {
      const icon = this.add
        .image(x, y, INGREDIENT_TEXTURE[id])
        .setDisplaySize(50, 50)
        .setInteractive({ useHandCursor: true });

      // Idle "tappable" breathing pulse, so these read as buttons rather
      // than static shelf decoration baked into the backdrop. Paused during
      // the tap-punch below so the two scale tweens never fight each other.
      const baseScale = icon.scale;
      const idlePulse = this.tweens.add({
        targets: icon,
        scale: baseScale * 1.08,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      icon.on('pointerdown', () => {
        playClick(this);
        if (held.isFull()) {
          this.tweens.add({ targets: icon, x: x + 6, duration: 50, yoyo: true, repeat: 3 });
          return;
        }
        idlePulse.pause();
        icon.setScale(baseScale);
        this.tweens.add({
          targets: icon,
          scale: baseScale * 1.3,
          duration: 150,
          yoyo: true,
          ease: 'Back.easeOut',
          onComplete: () => {
            icon.setScale(baseScale);
            idlePulse.resume();
          },
        });
        baker.moveTo(x, SHELF_REACH_Y, () => held.add(id));
      });
    });
  }

  private buildHud(): void {
    this.hudText = this.add.text(20, 20, '', {
      fontFamily: 'Arial Black',
      fontSize: '22px',
      color: '#f3e6c9',
      stroke: '#3b2417',
      strokeThickness: 4,
    });
    this.timerText = this.add
      .text(512, 20, '', {
        fontFamily: 'Arial Black',
        fontSize: '24px',
        color: '#f3e6c9',
        stroke: '#3b2417',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0);

    this.refreshHud();
    this.refreshTimer();
  }

  private buildBackground(): void {
    // One fully-illustrated backdrop (counter, shelving, register, plants
    // all baked in) instead of separate floor/wall/furniture pieces.
    this.add.image(0, 0, 'bakeryBackdrop').setOrigin(0, 0).setDisplaySize(1024, 768);

    this.add
      .text(HELD_HUD.x, HELD_HUD.y - 18, 'Holding:', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#f3e6c9',
      })
      .setOrigin(0, 0.5);
  }

  private refreshHud(): void {
    const modeLabel = this.mode === 'rush_hour' ? '    Rush Hour!' : '';
    this.hudText.setText(`Score: ${this.score.score}    Served: ${this.servedCount}${modeLabel}`);
  }

  private refreshTimer(): void {
    const remainingMs = Math.max(0, SHIFT_DURATION_MS - this.shiftElapsedMs);
    const totalSeconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    this.timerText.setText(`${minutes}:${String(seconds).padStart(2, '0')}`);
  }
}
