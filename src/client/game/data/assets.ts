import type { IngredientId } from '../../../shared/types';

// Maps a short texture key (used everywhere else in the game, including the
// dessertTexture/orderTexture fields on each Recipe) to its file name inside
// public/assets. Preloader.ts loops over this table so adding a new sprite
// never means touching loader code, only this list. See SPEC.md §4 for the
// full asset manifest this was built from.
export const GAME_ASSETS: Record<string, string> = {
  // The whole scene backdrop — a single illustrated bakery-front image
  // (counter, shelving, register, plants all baked in) rather than
  // separate floor/wall/furniture pieces. See GAME_DESIGN.md §10.
  bakeryBackdrop: 'brownwoodybakerybackground.png',

  // Main Menu / Game Over — a separate fully-illustrated scene (own cat
  // character, counter, menu board baked in) rather than reusing the
  // in-game backdrop, plus the wooden sign-style buttons for both screens.
  menuBackground: 'menubackground.png',
  playButton: 'play_button.png',
  howToPlayButton: 'how_to_play_button.png',
  backToMainMenuButton: 'back_to_main_menu_button.png',
  // Shared by both the How to Play and Game Over panels — same frame art at
  // two different displaySizes, loaded once under one key (mapping this file
  // to two separate keys made Phaser fetch it twice, since it caches by key
  // rather than filename).
  horizontalPanel: 'yellowhorizontalrect_nobg.png',
  recipeBookPanel: 'yellowverticalrect_nobg.png',

  // The door: closed by default, swapped to the time-of-day-appropriate
  // "open" texture while a customer is walking through it.
  doorClosed: 'browndoor_close.png',
  doorOpenDay: 'browndoor_open_night.png', // filename is a mislabel — content is daytime sky
  doorOpenSunset: 'browndoor_open_sunset.png',
  doorOpenNight: 'browndoor_open_nightt.png', // filename is a mislabel (extra "t") — content is nighttime

  // stations
  doughBowl: 'bowl_of_dough.png',

  // stand mixer: empty (idle), dough just dropped in (not yet spinning),
  // actively mixing, and finished — see StandMixerStation.ts.
  mixerEmpty: 'mixer_empty.png',
  mixerDoughIdle: 'mixer_dough_idle.png',
  mixerMixing: 'mixer_mixing.png',
  mixerMixed: 'mixer_mixed.png',

  // oven: idle, a brief preheat before the bake visual kicks in, actively
  // baking, and done — see OvenManager.ts. No new art for the broken state,
  // so that one keeps its original sprite.
  ovenEmpty: 'oven_empty.png',
  ovenPreheating: 'oven_preheating.png',
  ovenBaking: 'oven_baking.png',
  ovenReady: 'oven_ready.png',
  ovenBroken: 'oven_broken.png',

  // baker character (a chef wolf): one static idle pose per direction, plus
  // a 3-frame walk cycle per direction (frame 1 of the original 4-frame
  // export was lost before frames 2-4 were re-added, so the cycle is 3).
  wolfIdleFront: 'wolf_idle_front.png',
  wolfIdleBack: 'wolf_idle_back.png',
  wolfIdleLeft: 'wolf_idle_left.png',
  wolfIdleRight: 'wolf_idle_right.png',
  wolfWalkFront2: 'wolf_walk_front_2.png',
  wolfWalkFront3: 'wolf_walk_front_3.png',
  wolfWalkFront4: 'wolf_walk_front_4.png',
  wolfWalkBack2: 'wolf_walk_back_2.png',
  wolfWalkBack3: 'wolf_walk_back_3.png',
  wolfWalkBack4: 'wolf_walk_back_4.png',
  wolfWalkLeft2: 'wolf_walk_left_2.png',
  wolfWalkLeft3: 'wolf_walk_left_3.png',
  wolfWalkLeft4: 'wolf_walk_left_4.png',
  wolfWalkRight2: 'wolf_walk_right_2.png',
  wolfWalkRight3: 'wolf_walk_right_3.png',
  wolfWalkRight4: 'wolf_walk_right_4.png',

  // customer animal set (yellow cat, doggo, monkey): one static idle pose
  // per direction (used while queued at the counter) plus a 3-frame walk
  // cycle per direction. No angry or bag-carrying poses exist for these
  // (see Customer.ts doc comment for how that's handled).
  yellowCatIdleFront: 'yellowcat_idle_front.png',
  yellowCatIdleBack: 'yellowcat_idle_back.png',
  yellowCatIdleLeft: 'yellowcat_idle_left.png',
  yellowCatIdleRight: 'yellowcat_idle_right.png',
  yellowCatWalkFront2: 'yellowcat_walk_front_2.png',
  yellowCatWalkFront3: 'yellowcat_walk_front_3.png',
  yellowCatWalkFront4: 'yellowcat_walk_front_4.png',
  yellowCatWalkBack2: 'yellowcat_walk_back_2.png',
  yellowCatWalkBack3: 'yellowcat_walk_back_3.png',
  yellowCatWalkBack4: 'yellowcat_walk_back_4.png',
  yellowCatWalkLeft2: 'yellowcat_walk_left_2.png',
  yellowCatWalkLeft3: 'yellowcat_walk_left_3.png',
  yellowCatWalkLeft4: 'yellowcat_walk_left_4.png',
  yellowCatWalkRight1: 'yellowcat_walk_right_1.png',
  yellowCatWalkRight2: 'yellowcat_walk_right_2.png',
  yellowCatWalkRight4: 'yellowcat_walk_right_4.png',

  doggoIdleFront: 'doggo_idle_front_1.png',
  doggoIdleBack: 'doggo_idle_back_1.png',
  doggoIdleLeft: 'doggo_idle_left_1.png',
  doggoIdleRight: 'doggo_idle_right_1.png',
  doggoWalkFront2: 'doggo_walk_front_2.png',
  doggoWalkFront3: 'doggo_walk_front_3.png',
  doggoWalkFront4: 'doggo_walk_front_4.png',
  doggoWalkBack2: 'doggo_walk_back_2.png',
  doggoWalkBack3: 'doggo_walk_back_3.png',
  doggoWalkBack4: 'doggo_walk_back_4.png',
  doggoWalkLeft2: 'doggo_walk_left_2.png',
  doggoWalkLeft3: 'doggo_walk_left_3.png',
  doggoWalkLeft4: 'doggo_walk_left_4.png',
  doggoWalkRight2: 'doggo_walk_right_2.png',
  doggoWalkRight3: 'doggo_walk_right_3.png',
  doggoWalkRight4: 'doggo_walk_right_4.png',

  monkeyIdleFront: 'monkey_idle_front_1.png',
  monkeyIdleBack: 'monkey_idle_back_1.png',
  monkeyIdleLeft: 'monkey_idle_left_1.png',
  monkeyIdleRight: 'monkey_idle_right_1.png',
  monkeyWalkFront2: 'monkey_walk_front_2.png',
  monkeyWalkFront3: 'monkey_walk_front_3.png',
  monkeyWalkFront4: 'monkey_walk_front_4.png',
  monkeyWalkBack2: 'monkey_walk_back_2.png',
  monkeyWalkBack3: 'monkey_walk_back_3.png',
  monkeyWalkBack4: 'monkey_walk_back_4.png',
  monkeyWalkLeft2: 'monkey_walk_left_2.png',
  monkeyWalkLeft3: 'monkey_walk_left_3.png',
  monkeyWalkLeft4: 'monkey_walk_left_4.png',
  monkeyWalkRight2: 'monkey_walk_right_2.png',
  monkeyWalkRight3: 'monkey_walk_right_3.png',
  monkeyWalkRight4: 'monkey_walk_right_4.png',

  // order bubbles — single item...
  orderToast: 'order_toast.png',
  orderCroissant: 'order_croissant.png',
  orderBaguette: 'order_baguette.png',
  orderStrawberryTart: 'order_strawberry_tart.png',
  orderChocolateCake: 'order_chocolate_cake.png',
  orderStrawberryCake: 'order_strawberry_cake.png',
  // ...and the 4 fixed combo bubbles (see data/orders.ts)
  orderComboCroissantBaguette: 'order_croissant_baguette.png',
  orderComboCroissantBaguetteToast: 'order_croissant_baguette2.png',
  orderComboTartCake: 'order_tart_strawberry_cake.png',
  orderComboToastCake: 'order_toast_strawberry_cake.png',

  // finished desserts (display case stock icons)
  dessertToast: 'dessert_toast.png',
  dessertCroissant: 'dessert_croissant.png',
  dessertBaguette: 'dessert_baguette.png',
  dessertStrawberryTart: 'dessert_strawberry_tart.png',
  dessertChocolateCake: 'dessert_chocolate_slice.png',
  dessertStrawberryCake: 'dessert_strawberry_cake.png',

  // ingredients — all 7
  ingredientFlour: 'ingredient_flour.png',
  ingredientButter: 'ingredient_butter.png',
  ingredientEggs: 'ingredient_eggs.png',
  ingredientMilk: 'ingredient_milk.png',
  ingredientSugar: 'ingredient_sugar.png',
  ingredientBerries: 'ingredient_berries.png',
  ingredientChocolate: 'ingredient_chocolate.png',
};

// Every ingredient's texture key, defined once so recipes can reference any
// of the 7 without a separate lookup table per system.
export const INGREDIENT_TEXTURE: Record<IngredientId, string> = {
  flour: 'ingredientFlour',
  butter: 'ingredientButter',
  eggs: 'ingredientEggs',
  milk: 'ingredientMilk',
  sugar: 'ingredientSugar',
  berries: 'ingredientBerries',
  chocolate: 'ingredientChocolate',
};

// Separate from GAME_ASSETS (images) since Preloader.ts loads these via
// this.load.audio() instead of this.load.image() — see game/systems/Audio.ts
// for where each one actually gets played.
export const GAME_SOUNDS: Record<string, string> = {
  clickSound: 'clicksound.mp3',
  ovenSound: 'ovensound.mp3',
  ovenDingSound: 'ovending.mp3',
  mixerSound: 'mixersound.mp3',
  bgm: 'dessertosound.mp3',
};
