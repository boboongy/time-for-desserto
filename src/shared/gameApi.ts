// Request/response shapes for the game's server routes (src/server/routes/game.ts).
// A score submission is trusted server-side only — the client never decides
// its own rank, best score, or unlock/flair status.

export type DailySeedResponse = {
  date: string; // YYYY-MM-DD, UTC
  seed: number;
};

export type ShiftOutcome = 'complete' | 'closed_early';
export type GameMode = 'normal' | 'rush_hour';

export type SubmitScoreRequest = {
  score: number;
  served: number;
  outcome: ShiftOutcome;
  mode: GameMode;
};

export type SubmitScoreResponse = {
  rank: number;
  totalPlayers: number;
  isNewBest: boolean;
  bestScore: number;
  rushHourUnlocked: boolean;
  masterBakerAwarded: boolean;
};

export type LeaderboardEntry = {
  username: string;
  score: number;
};

export type LeaderboardResponse = {
  date: string;
  top: LeaderboardEntry[];
  yourRank: number | null;
  yourScore: number | null;
};

export type PlayerStateResponse = {
  rushHourUnlocked: boolean;
  bestScore: number;
};
