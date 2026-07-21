import * as Phaser from 'phaser';
import { comboChance, patienceBudgetMs, spawnIntervalMs, weightedFoodIds } from '../data/difficultyCurve';
import { pickOrder } from '../data/orders';
import { dailyRandom } from '../data/dailySeed';
import { Customer, CUSTOMER_SPECIES } from '../entities/Customer';

export type OrderManagerCallbacks = {
  onOrderTapped: (customer: Customer) => void;
  onExpired: (customer: Customer) => void;
  onDoorOpen: () => void;
  onDoorClose: () => void;
};

// The ramp is frozen at its easiest setting until the player has actually
// served this many orders — a fixed time-based grace period would either
// run out before a slow starter gets going, or waste time for a fast one.
// This same milestone also unlocks the 3rd counter slot (see
// startingActiveSlots below) — both are "first few serves" beginner easing,
// so they share one threshold rather than tracking two separate counters.
const GRACE_PERIOD_SERVES = 3;

/**
 * Owns the (up to 3) counter slots: decides when a new customer spawns
 * (via the difficulty curve — see data/difficultyCurve.ts), which slot they
 * take, and what they order. Game.ts still owns what happens when a bubble
 * is tapped, a patience timer expires, or the door needs to open/close
 * (passed in as callbacks) so all of that logic stays in one place.
 */
export class OrderManager {
  private readonly slots: (Customer | null)[];
  private spawnCountdownMs = 0;
  private gracePeriodServes = 0;
  private rampStartMs: number | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly slotPositions: { x: number; y: number }[],
    private readonly doorPosition: { x: number; y: number },
    private readonly callbacks: OrderManagerCallbacks,
    // Rush Hour mode passes < 1 here to shrink spawn intervals and patience
    // budgets uniformly — see GAME_DESIGN.md §9 "Skill-gated mode unlocks".
    private readonly difficultyMultiplier: number = 1,
    // How many slots are spawnable into before GRACE_PERIOD_SERVES lands —
    // defaults to every slot (Rush Hour and any other caller that doesn't
    // pass this opts out of the restriction, since it's a first-time-player
    // easing, not a general difficulty knob).
    private readonly startingActiveSlots: number = slotPositions.length
  ) {
    this.slots = slotPositions.map(() => null);
  }

  update(deltaMs: number, elapsedMs: number): void {
    const rampElapsedMs = this.rampElapsedMs(elapsedMs);

    this.spawnCountdownMs -= deltaMs;
    if (this.spawnCountdownMs <= 0) {
      this.trySpawn(rampElapsedMs);
      this.spawnCountdownMs = spawnIntervalMs(rampElapsedMs) * this.difficultyMultiplier;
    }
  }

  /** Call once per successful serve — ends the grace period once enough have landed. */
  notifyServed(): void {
    this.gracePeriodServes += 1;
  }

  /** Frees a customer's slot so a new one can spawn there — call after they leave. */
  release(customer: Customer): void {
    const index = this.slots.indexOf(customer);
    if (index !== -1) this.slots[index] = null;
  }

  /**
   * Time to feed the difficulty curve functions: 0 (easiest) until the
   * grace period ends, then real elapsed time measured from that moment —
   * so the ramp always starts from its easiest point once it begins,
   * regardless of how long the grace period itself took.
   */
  private rampElapsedMs(elapsedMs: number): number {
    if (this.rampStartMs === null) {
      if (this.gracePeriodServes < GRACE_PERIOD_SERVES) return 0;
      this.rampStartMs = elapsedMs;
    }
    return elapsedMs - this.rampStartMs;
  }

  /** How many slots are currently spawnable into — grows to all of them once the grace period ends. */
  private get activeSlotCount(): number {
    return this.gracePeriodServes >= GRACE_PERIOD_SERVES ? this.slots.length : this.startingActiveSlots;
  }

  private trySpawn(rampElapsedMs: number): void {
    // Fills from the rightmost active slot inward, so the first customer in
    // queues furthest from the door and later arrivals stack toward it.
    let index = -1;
    for (let i = this.activeSlotCount - 1; i >= 0; i--) {
      if (this.slots[i] === null) {
        index = i;
        break;
      }
    }
    if (index === -1) return;

    const pos = this.slotPositions[index];
    if (!pos) return;

    const order = pickOrder(comboChance(rampElapsedMs), weightedFoodIds(rampElapsedMs), dailyRandom.next);
    const patienceMs = patienceBudgetMs(rampElapsedMs) * this.difficultyMultiplier;
    const species = CUSTOMER_SPECIES[Math.floor(dailyRandom.next() * CUSTOMER_SPECIES.length)]!;

    const customer = new Customer(
      this.scene,
      species,
      this.doorPosition.x,
      this.doorPosition.y,
      pos.x,
      pos.y,
      order.foodIds,
      order.orderTexture,
      patienceMs,
      this.callbacks.onOrderTapped,
      this.callbacks.onExpired,
      this.callbacks.onDoorOpen,
      this.callbacks.onDoorClose
    );
    this.slots[index] = customer;
  }
}
