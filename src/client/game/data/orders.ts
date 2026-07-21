import type { FoodId } from '../../../shared/types';
import { RECIPES } from './recipes';

export type OrderDefinition = {
  foodIds: FoodId[];
  orderTexture: string;
};

// The order-bubble art only exists as 4 specific pre-drawn combos (not
// "any 2-3 items"), so combo orders are picked from this fixed pool rather
// than generated — see GAME_DESIGN.md §4.
const COMBO_ORDERS: OrderDefinition[] = [
  { foodIds: ['croissant', 'baguette'], orderTexture: 'orderComboCroissantBaguette' },
  { foodIds: ['croissant', 'baguette', 'toast'], orderTexture: 'orderComboCroissantBaguetteToast' },
  { foodIds: ['strawberry_tart', 'strawberry_cake'], orderTexture: 'orderComboTartCake' },
  { foodIds: ['toast', 'strawberry_cake'], orderTexture: 'orderComboToastCake' },
];

/**
 * Picks an order: a combo (from the fixed pool above) with probability
 * comboChance, otherwise a single item drawn from weightedFoodIds (which
 * may contain duplicates to bias toward certain tiers — see
 * data/difficultyCurve.ts). Takes the random source as a parameter (rather
 * than calling Math.random() itself) so it can be swapped for the daily
 * seeded generator — see data/dailySeed.ts.
 */
export function pickOrder(comboChance: number, weightedFoodIds: FoodId[], random: () => number): OrderDefinition {
  if (random() < comboChance) {
    const combo = COMBO_ORDERS[Math.floor(random() * COMBO_ORDERS.length)];
    if (combo) return combo;
  }

  const foodId = weightedFoodIds[Math.floor(random() * weightedFoodIds.length)] ?? 'toast';
  return { foodIds: [foodId], orderTexture: RECIPES[foodId].orderTexture };
}
