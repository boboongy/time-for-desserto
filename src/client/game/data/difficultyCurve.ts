import type { FoodId } from '../../../shared/types';

// Starting-point tuning values from GAME_DESIGN.md §6 "Difficulty ramp" —
// everything ramps smoothly across the shift, no discrete waves. Adjust
// here only; nothing else in the game should hardcode these numbers.
export const SHIFT_DURATION_MS = 150_000;

// Starting values loosened from the original 7500/18000 — the earliest
// orders were timing out before new players even finished one production
// loop (shelf -> mixer -> oven -> serve). End-of-shift values are untouched
// so the ramp still gets genuinely hard by the end.
const SPAWN_INTERVAL_START_MS = 10_000;
const SPAWN_INTERVAL_END_MS = 2500;
const PATIENCE_START_MS = 24_000;
const PATIENCE_END_MS = 8000;

const STARTER_TIER: FoodId[] = ['toast'];
const EASY_TIER: FoodId[] = ['croissant', 'baguette'];
const MID_TIER: FoodId[] = ['strawberry_tart'];
const ADVANCED_TIER: FoodId[] = ['chocolate_cake', 'strawberry_cake'];

function progress(elapsedMs: number, shiftMs: number): number {
  return Math.min(1, Math.max(0, elapsedMs / shiftMs));
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

export function spawnIntervalMs(elapsedMs: number, shiftMs: number = SHIFT_DURATION_MS): number {
  return lerp(SPAWN_INTERVAL_START_MS, SPAWN_INTERVAL_END_MS, progress(elapsedMs, shiftMs));
}

export function patienceBudgetMs(elapsedMs: number, shiftMs: number = SHIFT_DURATION_MS): number {
  return lerp(PATIENCE_START_MS, PATIENCE_END_MS, progress(elapsedMs, shiftMs));
}

export function comboChance(elapsedMs: number, shiftMs: number = SHIFT_DURATION_MS): number {
  const t = progress(elapsedMs, shiftMs);
  if (t < 0.33) return 0;
  if (t < 0.73) return 0.2;
  return 0.35;
}

/**
 * A weighted pool of single-item FoodIds to draw from (duplicates bias the
 * odds) — starts almost entirely Starter/Easy, shifts toward Advanced.
 */
export function weightedFoodIds(elapsedMs: number, shiftMs: number = SHIFT_DURATION_MS): FoodId[] {
  const t = progress(elapsedMs, shiftMs);

  const starterWeight = Math.round(lerp(5, 1, t));
  const easyWeight = Math.round(lerp(3, 2, t));
  const midWeight = Math.round(lerp(1, 3, t));
  const advancedWeight = Math.round(lerp(0, 4, t));

  const pool: FoodId[] = [];
  for (let i = 0; i < starterWeight; i++) pool.push(...STARTER_TIER);
  for (let i = 0; i < easyWeight; i++) pool.push(...EASY_TIER);
  for (let i = 0; i < midWeight; i++) pool.push(...MID_TIER);
  for (let i = 0; i < advancedWeight; i++) pool.push(...ADVANCED_TIER);

  return pool;
}
