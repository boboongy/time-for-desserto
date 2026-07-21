# Time for Desserto — Game Design

A cozy pixel-art bakery time-management game, built as a Reddit Devvit app. Inspired by cozy management games (Stardew Valley-style visuals, Cooking Mama/Overcooked-style pressure). Players run a bakery counter for a timed shift, serving cat customers and baking under an escalating clock.

## 1. Platform

- Reddit Devvit app (`devvit.json`), client built with Phaser 4 + TypeScript + Vite, server on Hono/tRPC.
- Runs inside Reddit's webview on both the mobile app and desktop browser — no separate builds needed.
- Single static landscape scene (no camera scrolling — see [§10 Visual & technical principles](#10-visual--technical-principles)).

## 2. Core loop

1. A customer (a cat in a business suit) takes an open counter slot — **3 slots** max at once — and raises an order bubble showing what they want.
2. Tap the order bubble. If that item is in stock in the display case, it's served instantly — happy customer, points banked.
3. Out of stock? Tap an ingredient on the shelf — the baker walks over and collects it into her held ingredients. Once she's holding the right set for a recipe, tap the stand mixer: she walks to it and mixes them into a dough.
4. Drag that dough onto the oven, or tap the oven directly to auto-use whatever dough is sitting there (**one oven, one item at a time**).
5. The oven bakes on a short real-time countdown, cycling through visual stages (see §5), then the item drops into the display case.
6. Each order bubble has a patience ring that drains continuously. If it hits zero, the customer leaves — **lose a heart** (3 hearts total).
7. Survive the ~2.5 minute shift (or run out of hearts) and the run ends; your score submits to the daily leaderboard.

The baker (a human chef character) physically walks between the ingredient shelves, stand mixer, and oven as you work each station — this isn't just a menu-tap interface, it's a small lived-in kitchen. There's no free-roam control: tapping a shelf or station is what sends her there (see [§10](#10-visual--technical-principles)).

## 3. Recipes

6 items, built from **7 real ingredients**: Flour, Butter, Eggs, Milk, Sugar, Berries, Chocolate. Ingredient count scales with tier.

| Item | Ingredients | Tier |
|---|---|---|
| Toast | Flour + Butter | Starter |
| Croissant | Flour + Butter + Milk | Easy |
| Baguette | Flour + Milk | Easy |
| Strawberry Tart | Flour + Butter + Berries | Mid |
| Chocolate Cake | Flour + Eggs + Chocolate | Advanced |
| Strawberry Cake | Flour + Eggs + Berries + Sugar | Advanced |

Exact bake times and point values are tuning parameters, set during playtesting — see [SPEC.md](SPEC.md) for starting defaults.

## 4. Orders

- **Single-item orders**: one customer wants one item — the baseline order type, used throughout the shift.
- **Combo orders** (2-3 items in one bubble): introduced as a late-shift difficulty spike. Roughly:
  - 0:00–0:50 — single-item only
  - 0:50–1:50 — ~20% of customers want 2 items
  - 1:50–end — ~35% want 2-3 items
- Patience ring drains for the whole bubble; all items in a combo must be served before the customer leaves happy.

## 5. Baking feedback

Collecting ingredients and mixing are the tactile, hands-on steps (walk-to-shelf, walk-to-mixer, a short mixing animation). Baking itself is a single drag-or-tap action once the dough exists; the oven communicates progress purely through a 3-stage texture swap plus a progress bar — **no extra taps during the bake itself**:

`dim (idle) → lit (baking) → ready (a "BAKING: READY" callout, unmistakably done)`

**Oven overheat**: baking too many items back-to-back without a breather heats the oven past its limit and it **breaks** — requires a quick tap-to-fix (~2.5s) before baking again. If a bake attempt itself is what pushes it over, that dough is lost in the mishap. This is a deliberate resource-management pressure valve layered on top of the patience-timer pressure, and only really bites late-shift when the ramp has pushed bake frequency up.

## 6. Difficulty ramp

**Grace period**: the ramp is frozen at its easiest setting until the player has served 2 orders — a fixed time-based grace period would either run out before a slow starter gets going, or waste time once someone's clearly fine. Once the 2nd order is served, the ramp begins from its easiest point, timed from that moment (not from shift start) — see `game/systems/OrderManager.ts`.

Once ramping, everything moves **smoothly and continuously** across the rest of the shift (no discrete waves/phases):

| | Start | End |
|---|---|---|
| Order spawn interval | ~7.5s | ~2.5s |
| Order complexity mix | mostly Toast/Croissant/Baguette | mostly Chocolate/Strawberry Cake |
| Patience budget | generous (~18s) | tight (~8s) |
| Combo order frequency | 0% | ~35% |

The single-oven bottleneck does a lot of the difficulty work for free: as longer-bake recipes appear more often late-shift, the one-oven-at-a-time constraint naturally creates the crunch without needing a separate mechanic. (First pass had patience starting at 13s/ending at 7s with no grace period — playtesting found that too punishing before the player had even learned the controls, hence the changes above.)

## 7. Recipe reference

A **Recipe Book** overlay (`game/ui/RecipeBook.ts`) lists all 6 recipes as "dessert icon = ingredient icons," shown once automatically before the shift starts — the shift clock and customer spawns don't begin until it's dismissed — and reopenable any time via a "Recipes" button in the bottom-right corner, which pauses the clock/spawns again for as long as it's open.

## 8. Win / lose / scoring

- **Shift Complete** — timer runs out with ≥1 heart remaining. Success state, graded by score (exact thresholds TBD via playtesting).
- **Bakery Closed Early** — 3rd heart lost before the timer ends. Failure state, but the score still counts and still submits to the leaderboard.
- **Perfect Day** — Shift Complete with 0 hearts lost. Rare, celebratory outcome; the natural trigger for a flair reward.
- Scoring: base value per item served + speed bonus (served while patience > 50%) + combo streak multiplier (resets on any miss).

## 9. Retention systems (why come back tomorrow)

- **Daily seeded challenge**: the server derives a deterministic seed from today's UTC date (`GET /api/daily-seed`); the client uses it to seed every order-picking decision for the whole shift (`shared/seededRandom.ts`, mulberry32), so everyone playing on a given date gets the identical order sequence — fair, comparable scores. If there's no server to reach (e.g. local testing), the client quietly falls back to `Math.random()` so the game is still fully playable.
- **Daily leaderboard**: `POST /api/score` writes to a Redis sorted set keyed by date (`leaderboard:{date}`); `GET /api/leaderboard` returns today's top 10 plus your rank. Naturally resets each day since it's a fresh key.
- **Reddit flair rewards** — kept deliberately simpler than a scheduled/cron design: checked synchronously on every score submission rather than via a recurring job.
  - *"Today's Top Baker"* — if your submission puts you at rank 1 for today, you get the flair immediately; if someone else already held it today, their flair is removed first (tracked via `dailyTopHolder:{date}` in Redis) so it doesn't go stale.
  - *"Master Baker"* — a one-time, permanent flair the first time your score crosses `MASTER_BAKER_SCORE` (800, see `shared/gameConstants.ts`). Takes priority over the daily flair in the same submission so a landmark run is never overwritten by a routine one.
- **Skill-gated mode unlock ("Rush Hour")**: reaching `RUSH_HOUR_UNLOCK_SCORE` (600) once permanently unlocks it (tracked per-user in Redis), surfaced as a second button on the Main Menu. Rather than a separate mode built from scratch, it reuses the same `Game` scene with every spawn-interval/patience value scaled by a fixed multiplier (`RUSH_HOUR_DIFFICULTY_MULTIPLIER = 0.65` in `Game.ts`). No shop, no currency — pure skill gate.

## 10. Visual & technical principles

Research summary and resulting decisions (see [SPEC.md](SPEC.md) for implementation detail):

- **No camera scrolling.** The whole bakery (3 counters, display case, prep table, mixer, oven) fits in one static landscape view. This sidesteps the hardest part of pixel-art camera work — sub-pixel jitter from a moving/following camera — entirely, by not having one.
- **Floor and wall are single images, not tiled.** The original tileset pieces (`sprite_01`/`sprite_04`) had to be tiled to cover the whole background, which left faint seams between repeats even after cleaning up the source art's transparent padding. Swapped for two large single images (`floorboard.png`, `brickwall.png`), cropped to the scene's aspect ratio and stretched to fill — one continuous image has no seams by construction.
- **Y-sorting.** The baker and any other movable sprite render in draw-order based on their Y position (lower on screen = drawn on top), so walking "behind" the counter vs. "in front of" it reads correctly — standard technique for 3/4-view pixel-art scenes.
- **Pixel-perfect rendering.** Texture smoothing/antialiasing disabled, sprite positions snapped to integer pixels every frame. Without this, even simple side-to-side walking reads as blurry or wobbly at typical pixel-art zoom levels.
- **Directional sprites.** The baker has front/back/side walk-and-idle sets; "side" is flipped horizontally for left vs. right movement. Facing is chosen by the dominant axis of the movement vector (4-directional, not 8-directional, matching the asset set).

## 11. Characters & world

- **Player character**: a human baker (blonde, white chef coat/hat) — full idle (front/back) and walk (side) animation sets. Walks between stations; this is the game's visual anchor.
- **Customers**: cats in business suits — walk in from an off-screen corner (no door — kept it simple after playtesting showed a drawn door looked out of place), queue at the counter with a draining patience bar, then walk back off-screen either happy (carrying a bag) or unhappy ("impatient," angry/steaming pose) when patience runs out.
- **Setting**: a fully decorated bakery interior — wood/tile floors, brick and plaster walls, doors, windows with outdoor views, counter + cash register, shelving, chalkboard menu, wall posters, hanging herbs, seating and potted plants, bread racks, rugs.

Full asset inventory with file paths: see [SPEC.md § Asset manifest](SPEC.md#asset-manifest).
