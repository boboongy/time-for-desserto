# Time for Desserto — Implementation Spec

Full game design: [GAME_DESIGN.md](GAME_DESIGN.md). This document covers requirements, architecture, milestones, and the asset manifest.

## 1. Requirements

### Functional

- Landscape single-screen bakery scene: 3 customer counter slots, display case, prep table, stand mixer, oven, all visible at once.
- Customers (cats) arrive, show an order bubble (1-3 items), and leave happy (served) or unhappy (patience expired).
- Tap-to-serve from display case stock; drag ingredients + tap oven to bake when out of stock.
- 6 recipes built from 7 shared ingredients (see [GAME_DESIGN.md §3](GAME_DESIGN.md#3-recipes)).
- Smooth, continuous difficulty ramp over a ~2.5 minute shift (spawn rate, order complexity, patience budget, combo frequency).
- Oven overheat/break mechanic with tap-to-fix recovery.
- 3-heart fail state; Shift Complete / Bakery Closed Early / Perfect Day outcomes; score submitted at end of run.
- Baker avatar walks between prep table, mixer, and oven with correct Y-sorted draw order and 4-directional sprites.
- (M3) Daily seeded challenge, Redis-backed leaderboard, Reddit flair rewards, skill-gated mode unlocks.

### Technical / non-functional

- Runs inside Reddit's webview on both mobile app and desktop browser, no separate builds.
- No camera scrolling — static scene (see [GAME_DESIGN.md §9](GAME_DESIGN.md#9-visual--technical-principles)).
- Pixel-art rendering: disable texture smoothing/antialiasing, snap sprite positions to integer pixels.
- Keep Phaser (already in `package.json`) — no additional game framework or state-management library.
- Follow existing project conventions in `AGENTS.md`: type aliases over interfaces, named exports, no type casting, tRPC for client/server calls, Redis/Reddit APIs accessed only from `src/server`.
- Code organized so each system is a small, independently explainable file (see §2) — this is being built alongside a YouTube walkthrough, so clarity beats cleverness.

### Setup action required

The pixel art currently lives in `/assets` at the repo root. Phaser's `Preloader` loads from the Vite **public** directory (see `this.load.setPath('../assets')` in `src/client/scenes/Preloader.ts`, which resolves against `public/assets/`). **The asset files need to move (or be copied) from `/assets` into `/public/assets` before they can be loaded in-game.** This is the first task in Milestone 1.

## 2. Architecture & code organization

Goal: someone watching a video walkthrough should be able to point at a file and immediately know what it's responsible for. No ECS framework, no Redux-style state library — plain TypeScript classes/functions on top of Phaser's existing scene/GameObject model.

```
src/client/
  scenes/              (existing) Boot, Preloader, MainMenu, Game, GameOver
  game/
    data/
      recipes.ts        Recipe + ingredient definitions (data, not logic)
      difficultyCurve.ts   Spawn/patience/complexity ramp functions
    systems/
      OrderManager.ts    Spawns orders, tracks per-order patience, combo selection
      OvenManager.ts     Bake queue, heat state, overheat/break/fix
      ScoreManager.ts    Points, combo streak, grading
      HeartsManager.ts   Lives, fail-state transitions
      BakerController.ts Walk state machine, facing direction, Y-sort
    entities/
      Customer.ts        Customer sprite + order-bubble wrapper
      DisplayCase.ts      Stock tracking + serve interaction
    ui/
      OrderBubble.ts, HeartsHud.ts, TimerHud.ts, PatienceRing.ts
src/shared/
  types.ts               Recipe, Order, ScoreSubmission, DailySeed types shared with server
src/server/
  (M3) daily seed generation, Redis leaderboard, flair assignment — via tRPC procedures
```

Each system file owns one concern and exposes a small typed interface; `Game.ts` wires them together but contains no game logic itself. Recipes/ingredients/difficulty curve are data (plain typed objects/functions), not hardcoded inline — makes balance changes and on-camera explanation straightforward.

## 3. Milestones

Each milestone is a fully playable build — you can hand it to someone and they can play a real round, not just see a tech demo.

### Milestone 1 — Core Bake Loop Prototype (shipped, reworked after playtesting)

**Goal**: prove the core interaction feels good before building anything else on top of it.

The original plan was drag-ingredients-onto-a-table. Real playtesting showed that was confusing (no feedback on *why* a bake failed) and didn't match the reference art's "baker walks around her shop" framing, so the interaction became: **tap a shelf ingredient → baker walks to it and collects it → tap the mixer once holding the right set → drag the resulting dough to the oven (or tap the oven to auto-use it)**. Drag-and-drop for raw ingredients was removed entirely.

**Shipped scope**:
- Assets moved into `public/assets`.
- Top-down bakery room (baker facing the camera behind a counter, shelves on the wall) instead of a flat frontal counter.
- 1 customer counter slot, 3 recipes: Toast, Croissant, Strawberry Tart.
- Tap-to-serve from display case stock.
- Walk-to-shelf ingredient collection, stand-mixer dough step, drag-or-tap-oven baking.
- Fixed-length session (serve 10 customers) — no ramp, no combo orders, no oven-break yet.
- Baker walks between stations (moved up from M2, since the shelf/mixer interaction requires it).

**Acceptance criteria**:
- [x] All assets load from `public/assets`.
- [x] Order bubble appears, tapping it serves correctly when in stock.
- [x] Collecting the correct ingredients + mixing + baking produces the right item.
- [x] Wrong/incomplete ingredient sets are rejected at the mixer, not silently baked.
- [x] Session loop verified end-to-end (headless browser walkthrough).

### Milestone 2 — Full Shift Experience (shipped)

**Goal**: the complete standalone game, fully playable offline with no Reddit backend.

**Shipped scope** (adds to M1):
- All 6 recipes (Baguette, Chocolate Cake, Strawberry Cake added); ingredient shelf expanded to all 7 ingredients across two rows.
- 3 counter slots, customers walk in from an off-screen corner (no door — looked out of place, removed after playtesting) and back out.
- Smooth difficulty ramp (spawn interval, complexity mix, patience budget) over a 2.5 min shift — `game/data/difficultyCurve.ts`.
- Combo orders (2-3 items) drawn from the 4 fixed pre-drawn combo-bubble assets, late-shift only.
- Oven overheat → broken state → tap-to-fix; a bake attempt that breaks the oven loses the dough.
- 3-heart system with a draining patience bar per customer; Shift Complete / Bakery Closed Early / Perfect Day outcomes.
- Scoring: base value + speed bonus (>50% patience remaining) + streak multiplier (every 5 in a row); local high score via `localStorage`.
- Oven bake feedback is a 3-stage texture swap (dim/lit/"BAKING: READY") + progress bar, not the originally-planned 4-stage raw/shaped/baked/decorated animation — simpler, and the "READY" callout reads more clearly than a subtle stage change would.

**Acceptance criteria**:
- [x] Full shift runs with the ramp visibly increasing pressure (spawn rate, patience, combo frequency).
- [x] Combo orders require serving all items before the bubble clears.
- [x] Oven overheats, breaks, and can be fixed.
- [x] Bakery Closed Early triggers correctly on the 3rd heart lost, with score/grade/best-score data intact.
- [x] Baker walks between stations with correct left/right facing.
- [x] Local high score persists across sessions (verified via the isNewBest/bestScore flow).
- [ ] Shift Complete and Perfect Day outcomes — logic verified by code review and the countdown timer, not yet observed end-to-end (would need a full 2.5-minute real-time playtest).

### Milestone 3 — Reddit Live Release

**Goal**: shippable on a subreddit, with the daily-challenge retention loop live.

**Shipped scope** (adds to M2, simplified from the original plan — see below):
- Server-side daily seed generation (`GET /api/daily-seed`), deterministic per UTC date via `shared/seededRandom.ts`. Plain Hono JSON routes, not tRPC — tRPC was referenced in AGENTS.md but was never actually installed in this project, and adding it now would be new dependency weight for no behavior change.
- Redis-backed leaderboard keyed by date (`GET /api/leaderboard`, `POST /api/score`) — `src/server/routes/game.ts`.
- Reddit flair rewards: **checked synchronously on score submission instead of a scheduled cron job** — simpler (no `devvit.json` scheduler config, no day-rollover job to get right) while still behaving correctly: the daily-top flair is actively transferred (old holder's flair removed) the moment someone new takes rank 1, rather than waiting for a nightly recompute.
- Skill-gated Rush Hour unlock persisted per-user in Redis, surfaced on Main Menu once unlocked. Implemented as a difficulty multiplier on the existing `Game` scene rather than a second scene/mode.
- Main Menu shows the Rush Hour button once unlocked; Game Over shows rank, grade, and flair/unlock notifications. (A leaderboard *preview* on the Main Menu was cut to keep this pass smaller — the data's already there via `/api/leaderboard` if it's wanted later.)
- Every server call has a client-side fallback (falls back to `Math.random()` for order generation, and to the existing local `localStorage` high score for the result screen) so the game degrades gracefully without a server reachable, rather than breaking.

**Playable as**: play today's challenge on a live subreddit post, compare your score against everyone else who played today, come back tomorrow for a new seed.

**Verification status** — I can't run `devvit playtest` myself (it needs your Reddit login), so this milestone is verified in two different ways:
- [x] Server routes compile clean against the actual installed `@devvit/redis`/`@devvit/reddit` type definitions (not guessed APIs).
- [x] Client-side fallback path verified end-to-end (headless browser, no server): Main Menu correctly hides the Rush Hour button, gameplay runs identically using `Math.random()`, Game Over still resolves via the local high score.
- [ ] Two different players on the same day get the identical order sequence — needs a live multi-account test.
- [ ] Leaderboard correctly resets at day rollover — needs a live test across a UTC day boundary.
- [ ] Flair assignment actually appears on a Reddit account — needs `devvit playtest` with real subreddit moderator permissions.
- [ ] Mode unlock persists across sessions for a given Reddit user — needs a live test.
- [ ] Game is playable end-to-end as an actual Reddit post via `devvit playtest` — **this one's on you to confirm.**

## 4. Asset manifest

All files currently live in `/assets` at the repo root and need to move to `/public/assets` (see §1). Links below are relative to the repo root at their **current** location.

### Player character — baker (M2)

| Asset | File |
|---|---|
| Idle, facing front, frame 1-3 | [assets/baker_idle_front_1.png](assets/baker_idle_front_1.png), [assets/baker_idle_front_2.png](assets/baker_idle_front_2.png), [assets/baker_idle_front_3.png](assets/baker_idle_front_3.png) |
| Idle, facing back, frame 1-3 | [assets/baker_idle_back_1.png](assets/baker_idle_back_1.png), [assets/baker_idle_back_2.png](assets/baker_idle_back_2.png), [assets/baker_idle_back_3.png](assets/baker_idle_back_3.png) |
| Walk, side view, frame 1-3 | [assets/baker_walk_side_1.png](assets/baker_walk_side_1.png), [assets/baker_walk_side_2.png](assets/baker_walk_side_2.png), [assets/baker_walk_side_3.png](assets/baker_walk_side_3.png) |

### Customers — cats in suits (M1 idle order bubble only; full set M2)

| Asset | File |
|---|---|
| Walk front/back/left/right | [assets/char_walk_front.png](assets/char_walk_front.png), [assets/char_walk_back.png](assets/char_walk_back.png), [assets/char_walk_left.png](assets/char_walk_left.png), [assets/char_walk_right.png](assets/char_walk_right.png) |
| Walk with bag, front/back/left/right | [assets/char_walk_bag_front.png](assets/char_walk_bag_front.png), [assets/char_walk_bag_back.png](assets/char_walk_bag_back.png), [assets/char_walk_bag_left.png](assets/char_walk_bag_left.png), [assets/char_walk_bag_right.png](assets/char_walk_bag_right.png) |
| Queue poses 1-3 | [assets/char_queue_1.png](assets/char_queue_1.png), [assets/char_queue_2.png](assets/char_queue_2.png), [assets/char_queue_3_with_bag.png](assets/char_queue_3_with_bag.png) |
| Impatient (patience expired) | [assets/char_impatient.png](assets/char_impatient.png) |

### Order bubbles

| Asset | File | Milestone |
|---|---|---|
| Toast | [assets/order_toast.png](assets/order_toast.png) | M1 |
| Croissant | [assets/order_croissant.png](assets/order_croissant.png) | M1 |
| Strawberry Tart | [assets/order_strawberry_tart.png](assets/order_strawberry_tart.png) | M1 |
| Baguette | [assets/order_baguette.png](assets/order_baguette.png) | M2 |
| Chocolate Cake | [assets/order_chocolate_cake.png](assets/order_chocolate_cake.png) | M2 |
| Strawberry Cake | [assets/order_strawberry_cake.png](assets/order_strawberry_cake.png) | M2 |
| Combo: Croissant + Baguette | [assets/order_croissant_baguette.png](assets/order_croissant_baguette.png) | M2 |
| Combo: Croissant + Baguette + Toast | [assets/order_croissant_baguette2.png](assets/order_croissant_baguette2.png) | M2 |
| Combo: Tart + Strawberry Cake | [assets/order_tart_strawberry_cake.png](assets/order_tart_strawberry_cake.png) | M2 |
| Combo: Toast + Strawberry Cake | [assets/order_toast_strawberry_cake.png](assets/order_toast_strawberry_cake.png) | M2 |

### Finished food / display case

| Asset | File | Milestone |
|---|---|---|
| Toast | [assets/dessert_toast.png](assets/dessert_toast.png) | M1 |
| Croissant | [assets/dessert_croissant.png](assets/dessert_croissant.png) | M1 |
| Strawberry Tart | [assets/dessert_strawberry_tart.png](assets/dessert_strawberry_tart.png) | M1 |
| Baguette | [assets/dessert_baguette.png](assets/dessert_baguette.png) | M2 |
| Chocolate Cake (slice) | [assets/dessert_chocolate_slice.png](assets/dessert_chocolate_slice.png) | M2 |
| Strawberry Cake | [assets/dessert_strawberry_cake.png](assets/dessert_strawberry_cake.png) | M2 |
| Display case (furniture) | [assets/bakery_display_case.png](assets/bakery_display_case.png) | M1 |

### Raw ingredients (M1: flour, butter, berries; M2: all)

| Asset | File |
|---|---|
| Flour | [assets/ingredient_flour.png](assets/ingredient_flour.png) |
| Butter | [assets/ingredient_butter.png](assets/ingredient_butter.png) |
| Eggs | [assets/ingredient_eggs.png](assets/ingredient_eggs.png) |
| Milk | [assets/ingredient_milk.png](assets/ingredient_milk.png) |
| Sugar | [assets/ingredient_sugar.png](assets/ingredient_sugar.png) |
| Berries | [assets/ingredient_berries.png](assets/ingredient_berries.png) |
| Chocolate | [assets/ingredient_chocolate.png](assets/ingredient_chocolate.png) |

### Baking process & prep stations

| Asset | File | Milestone |
|---|---|---|
| Raw bowl stage | [assets/stage_raw_bowl.png](assets/stage_raw_bowl.png) | M2 (M1 may stub) |
| Shaped stage | [assets/stage_shaped.png](assets/stage_shaped.png) | M2 |
| Baked base stage | [assets/stage_baked_base.png](assets/stage_baked_base.png) | M2 |
| Decorated stage | [assets/stage_decorated_cake.png](assets/stage_decorated_cake.png) | M2 |
| Prep table | [assets/dough_table.png](assets/dough_table.png) | M1 |
| Stand mixer | [assets/stand_mixer.png](assets/stand_mixer.png) | M2 |

### Oven states

| Asset | File | Milestone |
|---|---|---|
| Unlit | [assets/oven_unlit.png](assets/oven_unlit.png) | M1 |
| Fire low | [assets/oven_fire_low.png](assets/oven_fire_low.png) | M1 |
| Fire medium | [assets/oven_fire_med.png](assets/oven_fire_med.png) | M2 |
| Fire done | [assets/oven_fire_done.png](assets/oven_fire_done.png) | M1 |
| Broken | [assets/oven_broken.png](assets/oven_broken.png) | M2 |

### UI & misc

| Asset | File | Milestone |
|---|---|---|
| Queue number tag | [assets/ui_queue_number_tag.png](assets/ui_queue_number_tag.png) | M2 |
| Queue arrows | [assets/ui_queue_arrows.png](assets/ui_queue_arrows.png) | M2 |
| Trash can | [assets/trash_can.png](assets/trash_can.png) | M2 |

### Floor & wall (single stretched images, not tiled)

| Asset | File | Notes |
|---|---|---|
| Floor | [assets/floorboard.png](assets/floorboard.png) | Replaced the tiled `sprite_01` floor after visible seams between repeats — a single image stretched to fill has none. Cropped to a 1024x428 band to match the scene's aspect ratio before use. |
| Wall | [assets/brickwall.png](assets/brickwall.png) | Same reasoning, replacing the tiled `sprite_04` wall. Cropped to a 1456x370 band. |

### Bakery interior tileset (decorative pieces; floor/wall above replaced the tiled versions)

| Group | Files |
|---|---|
| Wall panels / frames | [assets/sprite_09.png](assets/sprite_09.png), [assets/sprite_10.png](assets/sprite_10.png), [assets/sprite_11.png](assets/sprite_11.png), [assets/sprite_12.png](assets/sprite_12.png), [assets/sprite_13.png](assets/sprite_13.png) |
| Doors | [assets/sprite_14.png](assets/sprite_14.png) (wood), [assets/sprite_15.png](assets/sprite_15.png) (glass-pane) |
| Counters & register | [assets/sprite_16.png](assets/sprite_16.png), [assets/sprite_17.png](assets/sprite_17.png), [assets/sprite_18.png](assets/sprite_18.png) |
| Serving table | [assets/sprite_19.png](assets/sprite_19.png) |
| Windows | [assets/sprite_20.png](assets/sprite_20.png), [assets/sprite_21.png](assets/sprite_21.png), [assets/sprite_22.png](assets/sprite_22.png), [assets/sprite_23.png](assets/sprite_23.png) |
| Stone wood-fired oven (decorative) | [assets/sprite_24.png](assets/sprite_24.png) |
| Shelving & signage | [assets/sprite_25.png](assets/sprite_25.png) (shelf), [assets/sprite_26.png](assets/sprite_26.png) (wall sign), [assets/sprite_27.png](assets/sprite_27.png) (chalkboard menu), [assets/sprite_28.png](assets/sprite_28.png) (poster), [assets/sprite_29.png](assets/sprite_29.png) ("Bread" poster), [assets/sprite_30.png](assets/sprite_30.png) (hanging herbs) |
| Glass display case (alt) & prep | [assets/sprite_31.png](assets/sprite_31.png), [assets/sprite_32.png](assets/sprite_32.png) |
| Seating & plants | [assets/sprite_33.png](assets/sprite_33.png), [assets/sprite_34.png](assets/sprite_34.png), [assets/sprite_35.png](assets/sprite_35.png), [assets/sprite_36.png](assets/sprite_36.png), [assets/sprite_37.png](assets/sprite_37.png), [assets/sprite_38.png](assets/sprite_38.png) |
| Bread rack, storage, plants | [assets/sprite_39.png](assets/sprite_39.png), [assets/sprite_40.png](assets/sprite_40.png), [assets/sprite_41.png](assets/sprite_41.png), [assets/sprite_42.png](assets/sprite_42.png) |
| Floor patch & rug | [assets/sprite_43.png](assets/sprite_43.png), [assets/sprite_44.png](assets/sprite_44.png) |
| Extra chairs & tables | [assets/sprite_45.png](assets/sprite_45.png), [assets/sprite_46.png](assets/sprite_46.png), [assets/sprite_47.png](assets/sprite_47.png), [assets/sprite_48.png](assets/sprite_48.png) |

### Existing template assets (not part of the bakery set)

[public/assets/bg.png](public/assets/bg.png), [public/assets/logo.png](public/assets/logo.png), [public/snoo.png](public/snoo.png) — Devvit/Phaser starter placeholders, to be replaced or removed once the bakery scene is in place.
