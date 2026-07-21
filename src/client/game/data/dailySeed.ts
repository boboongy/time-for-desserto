import { createSeededRandom } from '../../../shared/seededRandom';
import type { DailySeedResponse } from '../../../shared/gameApi';

/**
 * The random source every order-generation decision should use. Starts as
 * plain Math.random() so the game is immediately playable (including when
 * there's no server at all, e.g. local testing outside Devvit); once
 * loadDailySeed() resolves, it's swapped for a seeded generator so every
 * player gets today's identical order sequence — see GAME_DESIGN.md §9.
 */
export const dailyRandom = { next: Math.random };

export async function loadDailySeed(): Promise<void> {
  try {
    const response = await fetch('/api/daily-seed');
    if (!response.ok) return;
    const data = (await response.json()) as DailySeedResponse;
    dailyRandom.next = createSeededRandom(data.seed);
  } catch {
    // No server reachable (e.g. local static-file testing) — keep Math.random().
  }
}
