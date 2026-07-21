import { Scene } from 'phaser';
import type { ShiftOutcome } from '../../shared/gameApi';
import { gradeForScore } from '../game/data/grading';
import { ensureBgmPlaying, playClick } from '../game/systems/Audio';

type GameOverData = {
  outcome: ShiftOutcome;
  perfectDay: boolean;
  score: number;
  served: number;
  isNewBest: boolean;
  bestScore: number;
  rank: number;
  totalPlayers: number;
  rushHourUnlocked: boolean;
  masterBakerAwarded: boolean;
};

/**
 * End-of-shift summary — the three outcomes from GAME_DESIGN.md §8:
 * Shift Complete (graded by score), Bakery Closed Early (ran out of
 * hearts), or Perfect Day (Complete with no hearts lost). Rank/flair/unlock
 * fields come from the server's score submission (src/server/routes/game.ts)
 * and are 0/false when there was no server to reach.
 */
export class GameOver extends Scene {
  private result!: GameOverData;

  constructor() {
    super('GameOver');
  }

  init(data: GameOverData) {
    this.result = data;
  }

  create() {
    ensureBgmPlaying(this);

    const {
      outcome,
      perfectDay,
      score,
      served,
      isNewBest,
      bestScore,
      rank,
      totalPlayers,
      rushHourUnlocked,
      masterBakerAwarded,
    } = this.result;

    const headline = perfectDay ? 'Perfect Day!' : outcome === 'complete' ? 'Shift Complete!' : 'Bakery Closed Early';
    const headlineColor = outcome === 'closed_early' ? '#d9455f' : '#3b2417';

    // Same illustrated backdrop as the shift itself, but door closed and
    // dimmed — reads as "the shop's closed for the day" instead of a
    // generic flat-color results screen.
    this.add.image(0, 0, 'bakeryBackdrop').setOrigin(0, 0).setDisplaySize(1024, 768);
    this.add.image(225, 260, 'doorClosed').setDisplaySize(110, 165);
    this.add.rectangle(512, 384, 1024, 768, 0x000000, 0.45);

    // Sized to the content's own height (rather than the frame's native
    // aspect ratio) so nothing gets cramped or clipped.
    this.add.image(512, 340, 'horizontalPanel').setDisplaySize(857, 460);

    // Panel's decorative border eats into its own top/bottom edges, so
    // everything below sits inside its ~195-505 cream interior, and the
    // restart button sits below the panel entirely (measured empirically —
    // see the Recipe Book panel's identical treatment).
    this.add
      .text(512, 213, headline, {
        fontFamily: 'Arial Black',
        fontSize: '40px',
        color: headlineColor,
        stroke: '#3b2417',
        strokeThickness: 7,
      })
      .setOrigin(0.5);

    if (outcome === 'complete') {
      this.add
        .text(512, 255, gradeForScore(score), {
          fontFamily: 'Arial Black',
          fontSize: '22px',
          color: '#3b2417',
        })
        .setOrigin(0.5);
    }

    this.add
      .text(512, 295, `Score: ${score}`, {
        fontFamily: 'Arial',
        fontSize: '26px',
        color: '#3b2417',
      })
      .setOrigin(0.5);

    this.add
      .text(512, 330, `Customers served: ${served}`, {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#3b2417',
      })
      .setOrigin(0.5);

    this.add
      .text(512, 360, isNewBest ? 'New best score!' : `Best: ${bestScore}`, {
        fontFamily: 'Arial Black',
        fontSize: '16px',
        color: '#3b2417',
      })
      .setOrigin(0.5);

    if (totalPlayers > 0) {
      this.add
        .text(512, 390, `Today's rank: #${rank} of ${totalPlayers}`, {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: '#3b2417',
        })
        .setOrigin(0.5);
    }

    let noticeY = 420;
    if (masterBakerAwarded) {
      this.add
        .text(512, noticeY, 'Flair earned: Master Baker!', {
          fontFamily: 'Arial Black',
          fontSize: '16px',
          color: '#3b2417',
        })
        .setOrigin(0.5);
      noticeY += 28;
    } else if (rank === 1) {
      this.add
        .text(512, noticeY, "Flair earned: Today's Top Baker!", {
          fontFamily: 'Arial Black',
          fontSize: '16px',
          color: '#3b2417',
        })
        .setOrigin(0.5);
      noticeY += 28;
    }

    if (rushHourUnlocked) {
      this.add
        .text(512, noticeY, 'Rush Hour mode unlocked!', {
          fontFamily: 'Arial Black',
          fontSize: '16px',
          color: '#3b2417',
        })
        .setOrigin(0.5);
    }

    const restartButton = this.add
      .image(512, 605, 'backToMainMenuButton')
      .setDisplaySize(260, 57)
      .setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: restartButton,
      alpha: 0.7,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    // A dedicated button rather than "any tap anywhere" — see MainMenu's
    // start prompt for why (avoids colliding with whatever's at the same
    // screen position in the next scene).
    restartButton.once('pointerdown', () => {
      playClick(this);
      this.scene.start('MainMenu');
    });
  }
}
