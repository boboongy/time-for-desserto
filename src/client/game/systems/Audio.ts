import * as Phaser from 'phaser';

const BGM_KEY = 'bgm';

/** A short tap cue — call from any tappable element's pointerdown handler. */
export function playClick(scene: Phaser.Scene): void {
  scene.sound.play('clickSound', { volume: 0.5 });
}

/** Plays once when a bake actually starts (not on every oven tap — see Game.ts's oven wiring). */
export function playOvenStart(scene: Phaser.Scene): void {
  scene.sound.play('ovenSound', { volume: 0.6 });
}

/** Plays once when the mixer's dough-to-mixed animation starts. */
export function playMixerStart(scene: Phaser.Scene): void {
  scene.sound.play('mixerSound', { volume: 0.6 });
}

/** Plays once when a bake finishes (oven reaches "done"), not on every tap. */
export function playOvenDing(scene: Phaser.Scene): void {
  scene.sound.play('ovenDingSound', { volume: 0.6 });
}

/**
 * Starts the looping cafe theme if it isn't already playing. Sounds live on
 * the game-wide SoundManager (not per-scene), so once started from the Main
 * Menu this keeps playing across scene transitions on its own — safe to call
 * again from anywhere (e.g. Game.ts) as a fallback, it's a no-op if already
 * playing.
 */
export function ensureBgmPlaying(scene: Phaser.Scene): void {
  const existing = scene.sound.get(BGM_KEY);
  if (existing?.isPlaying) return;
  scene.sound.play(BGM_KEY, { loop: true, volume: 0.35 });
}
