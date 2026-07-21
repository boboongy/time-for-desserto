const COMBO_STEP = 5;
const COMBO_BONUS_PER_STEP = 0.1;
const SPEED_BONUS_MULTIPLIER = 1.5;
const SPEED_BONUS_PATIENCE_THRESHOLD = 0.5;

/**
 * Scoring from GAME_DESIGN.md §7: base value per item, a speed bonus for
 * serving while patience is still high, and a streak multiplier that grows
 * every 5 consecutive serves and resets on any miss.
 */
export class ScoreManager {
  private total = 0;
  private comboStreak = 0;

  get score(): number {
    return this.total;
  }

  get streak(): number {
    return this.comboStreak;
  }

  /** Registers a successful serve and returns the points it earned. */
  registerServe(basePoints: number, patienceRatioRemaining: number): number {
    const speedMultiplier = patienceRatioRemaining > SPEED_BONUS_PATIENCE_THRESHOLD ? SPEED_BONUS_MULTIPLIER : 1;
    const comboMultiplier = 1 + Math.floor(this.comboStreak / COMBO_STEP) * COMBO_BONUS_PER_STEP;

    const points = Math.round(basePoints * speedMultiplier * comboMultiplier);
    this.total += points;
    this.comboStreak += 1;
    return points;
  }

  /** Registers a missed order (patience expired) — resets the streak, no points lost. */
  registerMiss(): void {
    this.comboStreak = 0;
  }
}
