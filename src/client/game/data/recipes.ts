import type { FoodId, IngredientId, Recipe } from '../../../shared/types';

// All six recipes from GAME_DESIGN.md §3.
export const RECIPES: Record<FoodId, Recipe> = {
  toast: {
    id: 'toast',
    name: 'Toast',
    ingredients: ['flour', 'butter'],
    bakeTimeMs: 3000,
    points: 10,
    dessertTexture: 'dessertToast',
    orderTexture: 'orderToast',
  },
  croissant: {
    id: 'croissant',
    name: 'Croissant',
    ingredients: ['flour', 'butter', 'milk'],
    bakeTimeMs: 6000,
    points: 20,
    dessertTexture: 'dessertCroissant',
    orderTexture: 'orderCroissant',
  },
  baguette: {
    id: 'baguette',
    name: 'Baguette',
    ingredients: ['flour', 'milk'],
    bakeTimeMs: 5000,
    points: 15,
    dessertTexture: 'dessertBaguette',
    orderTexture: 'orderBaguette',
  },
  strawberry_tart: {
    id: 'strawberry_tart',
    name: 'Strawberry Tart',
    ingredients: ['flour', 'butter', 'berries'],
    bakeTimeMs: 7000,
    points: 30,
    dessertTexture: 'dessertStrawberryTart',
    orderTexture: 'orderStrawberryTart',
  },
  chocolate_cake: {
    id: 'chocolate_cake',
    name: 'Chocolate Cake',
    ingredients: ['flour', 'eggs', 'chocolate'],
    bakeTimeMs: 10000,
    points: 45,
    dessertTexture: 'dessertChocolateCake',
    orderTexture: 'orderChocolateCake',
  },
  strawberry_cake: {
    id: 'strawberry_cake',
    name: 'Strawberry Cake',
    ingredients: ['flour', 'eggs', 'berries', 'sugar'],
    bakeTimeMs: 11000,
    points: 50,
    dessertTexture: 'dessertStrawberryCake',
    orderTexture: 'orderStrawberryCake',
  },
};

// Listed explicitly (rather than Object.keys(RECIPES)) to avoid a type cast
// back to FoodId[] — see AGENTS.md "Never cast typescript types".
export const ALL_FOOD_IDS: FoodId[] = [
  'toast',
  'croissant',
  'baguette',
  'strawberry_tart',
  'chocolate_cake',
  'strawberry_cake',
];

/**
 * Finds which (if any) of the given recipes exactly matches the staged
 * ingredients — same items, no extras, no substitutes. Order doesn't
 * matter, so two sorted-and-joined strings are compared.
 */
export function matchRecipe(staged: IngredientId[], candidateFoodIds: FoodId[]): FoodId | null {
  const stagedKey = [...staged].sort().join(',');

  const match = candidateFoodIds.find((foodId) => {
    const recipe = RECIPES[foodId];
    return [...recipe.ingredients].sort().join(',') === stagedKey;
  });

  return match ?? null;
}
