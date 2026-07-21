export type IngredientId = 'flour' | 'butter' | 'eggs' | 'milk' | 'sugar' | 'berries' | 'chocolate';

export type FoodId =
  | 'toast'
  | 'croissant'
  | 'baguette'
  | 'strawberry_tart'
  | 'chocolate_cake'
  | 'strawberry_cake';

export type Recipe = {
  id: FoodId;
  name: string;
  ingredients: IngredientId[];
  bakeTimeMs: number;
  points: number;
  /** Texture key for the finished item in the display case (see data/assets.ts) */
  dessertTexture: string;
  /** Texture key for the customer's order bubble */
  orderTexture: string;
};
