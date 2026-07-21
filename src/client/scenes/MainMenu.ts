import { Scene } from 'phaser';
import type { GameObjects } from 'phaser';
import type { PlayerStateResponse } from '../../shared/gameApi';
import { ensureBgmPlaying, playClick } from '../game/systems/Audio';

const HOW_TO_PLAY_TEXT =
  'Tap shelf ingredients to collect them, tap the mixer to make dough,\n' +
  'then drag it to the oven (or tap the oven) to bake.\n' +
  'Tap the order bubble to serve. Keep all 3 counters happy —\n' +
  'you have 3 hearts and 2:30 on the clock.';

/**
 * Title screen. FIT scale mode means this can just use fixed 1024x768
 * coordinates — no resize handling needed (see game.ts). Uses a dedicated
 * menuBackground illustration (its own cat character/counter/menu board
 * baked in) rather than reusing the in-game backdrop, so nothing extra
 * needs to be layered on top of it.
 */
export class MainMenu extends Scene {
  constructor() {
    super('MainMenu');
  }

  create() {
    // Browsers block autoplay until a user gesture — this catches the very
    // first tap anywhere on the menu (whichever button it lands on) without
    // interfering with that button's own handler.
    this.input.once('pointerdown', () => ensureBgmPlaying(this));

    this.add.image(0, 0, 'menuBackground').setOrigin(0, 0).setDisplaySize(1024, 768);

    this.add
      .text(512, 50, 'Time for Desserto', {
        fontFamily: 'Arial Black',
        fontSize: '46px',
        color: '#f3e6c9',
        stroke: '#3b2417',
        strokeThickness: 8,
        align: 'center',
      })
      .setOrigin(0.5);

    const playButton = this.add
      .image(512, 630, 'playButton')
      .setDisplaySize(240, 53)
      .setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: playButton,
      alpha: 0.7,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    playButton.once('pointerdown', () => {
      playClick(this);
      this.scene.start('Game');
    });

    const howToPlayButton = this.add
      .image(512, 690, 'howToPlayButton')
      .setDisplaySize(200, 44)
      .setInteractive({ useHandCursor: true });

    const howToPlayOverlay = this.buildHowToPlayOverlay();
    howToPlayButton.on('pointerdown', () => {
      playClick(this);
      howToPlayOverlay.setVisible(true);
    });

    // Hidden until we confirm it's unlocked (see loadPlayerState below).
    const rushHourButton = this.add
      .text(512, 735, 'Rush Hour Mode unlocked — tap to play', {
        fontFamily: 'Arial Black',
        fontSize: '15px',
        color: '#e3a857',
        stroke: '#3b2417',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);

    rushHourButton.once('pointerdown', () => {
      playClick(this);
      this.scene.start('Game', { mode: 'rush_hour' });
    });

    void this.loadPlayerState(rushHourButton);
  }

  /** A dismissable overlay for the how-to-play text, kept off the main screen so that stays simple. */
  private buildHowToPlayOverlay(): GameObjects.Container {
    const backdrop = this.add.rectangle(512, 384, 1024, 768, 0x000000, 0.6).setInteractive();
    const panel = this.add.image(512, 384, 'horizontalPanel').setDisplaySize(700, 376);
    const title = this.add
      .text(512, 290, 'How to Play', {
        fontFamily: 'Arial Black',
        fontSize: '28px',
        color: '#3b2417',
      })
      .setOrigin(0.5);
    const body = this.add
      .text(512, 380, HOW_TO_PLAY_TEXT, {
        fontFamily: 'Arial',
        fontSize: '17px',
        color: '#3b2417',
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5);

    const container = this.add.container(0, 0, [backdrop, panel, title, body]).setDepth(1000).setVisible(false);

    const closeLabel = this.add
      .text(512, 490, 'Close', {
        fontFamily: 'Arial Black',
        fontSize: '20px',
        color: '#d9455f',
        stroke: '#3b2417',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    closeLabel.on('pointerdown', () => {
      playClick(this);
      container.setVisible(false);
    });
    container.add(closeLabel);

    return container;
  }

  private async loadPlayerState(rushHourButton: GameObjects.Text): Promise<void> {
    try {
      const response = await fetch('/api/player-state');
      if (!response.ok) return;
      const data = (await response.json()) as PlayerStateResponse;
      rushHourButton.setVisible(data.rushHourUnlocked);
    } catch {
      // No server reachable (e.g. local static-file testing) — stays hidden.
    }
  }
}
