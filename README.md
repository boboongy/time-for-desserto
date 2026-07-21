# Time for Desserto

A cozy pixel-art time-management bakery game — bake, serve, repeat. Built as a
[Devvit](https://developers.reddit.com/) web app that runs directly inside a Reddit post.

**▶ [Play it on Reddit](https://www.reddit.com/r/time_for_desserto_dev/comments/1uwps9m/timefordesserto/)**

## Tech stack

| Layer | Tech |
| --- | --- |
| Client | [Phaser](https://phaser.io/) (game engine) + TypeScript + [Vite](https://vite.dev/) |
| Server | [Hono](https://hono.dev/) on Devvit's Node runtime |
| Storage | Redis (daily leaderboard, best scores, unlock/flair state) |
| Platform | [Devvit](https://developers.reddit.com/) — runs as a web app inside a Reddit post |

## Project structure

```
src/
  client/
    scenes/          Phaser scenes: Boot -> Preloader -> MainMenu -> Game -> GameOver
    game/
      systems/        Self-contained gameplay pieces (oven, mixer, baker movement,
                       audio, hearts, score, door) — each owns its own visuals + state
      entities/       Customer.ts (the queued NPCs placing orders)
      data/           Static config: recipes, difficulty curve, asset manifest,
                       daily seed, high score, order generation
      ui/             RecipeBook.ts (the reference overlay)
    splash.ts/.html    The lightweight screen shown inline in the Reddit feed
    game.ts/.html      The full game, opened in expanded view

  server/
    index.ts          Hono app entry point
    routes/           game.ts (score/leaderboard/daily-seed API), menu.ts
                       (mod-menu actions), forms.ts, triggers.ts
    core/post.ts       Creates the Reddit post that hosts the game

  shared/             Types and constants used by both client and server
```

Two entrypoints are registered in [`devvit.json`](devvit.json): `splash.html` (shown
inline in the subreddit feed) and `game.html` (opened in expanded view when the player
taps Start).

## Getting started

Requires Node ≥ 22.

```
npm install
npm run login   # connects the CLI to your Reddit account
npm run dev      # devvit playtest — live-installs the app on the subreddit set in devvit.json
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts a live dev session on Reddit (`devvit playtest`) |
| `npm run build` | Builds the client and server |
| `npm run type-check` | Runs the TypeScript compiler with no emit |
| `npm run lint` | Runs ESLint over `src/` |
| `npm run deploy` | Type-checks, lints, then uploads a new app version (`devvit upload`) |
| `npm run launch` | Runs `deploy`, then submits the app for review (`devvit publish`) |

Before pushing changes, run type-check + lint + build — this is the standard
verification pass used throughout development.

## Game overview

The core loop, all wired together in [`Game.ts`](src/client/scenes/Game.ts):

1. Tap an ingredient on the shelf — the baker walks over and picks it up.
2. Tap the mixer once you're holding the right ingredients — it mixes dough for a
   matching recipe (see [`recipes.ts`](src/client/game/data/recipes.ts)).
3. Drag the dough onto an oven, or tap the oven directly — it bakes automatically.
4. Tap a customer's order bubble to serve them from the display case.

Miss three orders (hearts run out) and the shift ends. Every player faces the same
daily-seeded shift (see [`dailySeed.ts`](src/client/game/data/dailySeed.ts)), so scores
are directly comparable — the server ([`game.ts`](src/server/routes/game.ts)) tracks a
daily leaderboard in Redis and awards real Reddit user flair ("Today's Top Baker",
permanent "Master Baker") based on it. Clearing a normal shift well enough unlocks the
faster Rush Hour mode.

## Where things live (quick reference)

| I want to change... | Look at... |
| --- | --- |
| Station/HUD positions on screen | The constants at the top of [`Game.ts`](src/client/scenes/Game.ts) |
| A recipe or ingredient | [`recipes.ts`](src/client/game/data/recipes.ts) |
| Difficulty pacing (spawn rate, patience) | [`difficultyCurve.ts`](src/client/game/data/difficultyCurve.ts) |
| A sprite or sound file | Add the file to `public/assets/`, then add one line to [`assets.ts`](src/client/game/data/assets.ts) — the Preloader picks it up automatically |
| Sound playback | [`Audio.ts`](src/client/game/systems/Audio.ts) |
| Oven/mixer behavior | [`OvenManager.ts`](src/client/game/systems/OvenManager.ts) / [`StandMixerStation.ts`](src/client/game/systems/StandMixerStation.ts) |
| Baker movement | [`BakerController.ts`](src/client/game/systems/BakerController.ts) — she only ever strafes left/right |
| Leaderboard / flair / score API | [`routes/game.ts`](src/server/routes/game.ts) |
| Menu actions (mod tools) | [`devvit.json`](devvit.json) + [`routes/menu.ts`](src/server/routes/menu.ts) |

## Credits

Built on the [Devvit Phaser starter template](https://github.com/phaserjs/template-vite-ts).