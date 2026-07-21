const STORAGE_KEY = 'timeForDesserto.bestScore';

export function getBestScore(): number {
  const raw = localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? Number(raw) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Saves the score if it beats the stored best. Returns the (possibly updated) best. */
export function submitScore(score: number): { isNewBest: boolean; bestScore: number } {
  const current = getBestScore();
  if (score > current) {
    localStorage.setItem(STORAGE_KEY, String(score));
    return { isNewBest: true, bestScore: score };
  }
  return { isNewBest: false, bestScore: current };
}
