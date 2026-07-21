import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import { hashStringToSeed } from '../../shared/seededRandom';
import { MASTER_BAKER_SCORE, RUSH_HOUR_UNLOCK_SCORE } from '../../shared/gameConstants';
import type {
  DailySeedResponse,
  LeaderboardResponse,
  PlayerStateResponse,
  SubmitScoreRequest,
  SubmitScoreResponse,
} from '../../shared/gameApi';

type ErrorResponse = {
  status: 'error';
  message: string;
};

const KEY_EXPIRY_SECONDS = 2 * 24 * 60 * 60; // 2 days — plenty past a given day's relevance

function todayDateString(): string {
  const iso = new Date().toISOString();
  return iso.slice(0, 10); // YYYY-MM-DD, UTC
}

function leaderboardKey(date: string): string {
  return `leaderboard:${date}`;
}

function dailyTopHolderKey(date: string): string {
  return `dailyTopHolder:${date}`;
}

function bestScoreKey(username: string): string {
  return `bestScore:${username}`;
}

function rushHourUnlockKey(username: string): string {
  return `unlock:rushHour:${username}`;
}

function masterBakerFlairKey(username: string): string {
  return `flair:masterBaker:${username}`;
}

/** Converts Redis' ascending zRank (0 = worst) into a 1-based leaderboard rank (1 = best). */
async function computeRank(key: string, username: string): Promise<{ rank: number; total: number } | null> {
  const [ascendingRank, total] = await Promise.all([redis.zRank(key, username), redis.zCard(key)]);
  if (ascendingRank === undefined) return null;
  return { rank: total - ascendingRank, total };
}

export const game = new Hono();

game.get('/daily-seed', (c) => {
  const date = todayDateString();
  return c.json<DailySeedResponse>({ date, seed: hashStringToSeed(date) });
});

game.get('/leaderboard', async (c) => {
  const date = todayDateString();
  const key = leaderboardKey(date);
  const username = context.username;

  const top = await redis.zRange(key, 0, 9, { by: 'rank', reverse: true });

  let yourRank: number | null = null;
  let yourScore: number | null = null;
  if (username) {
    const [rankInfo, score] = await Promise.all([computeRank(key, username), redis.zScore(key, username)]);
    yourRank = rankInfo?.rank ?? null;
    yourScore = score ?? null;
  }

  return c.json<LeaderboardResponse>({
    date,
    top: top.map((entry) => ({ username: entry.member, score: entry.score })),
    yourRank,
    yourScore,
  });
});

game.get('/player-state', async (c) => {
  const username = context.username;
  if (!username) {
    return c.json<PlayerStateResponse>({ rushHourUnlocked: false, bestScore: 0 });
  }

  const [unlockFlag, bestScoreRaw] = await Promise.all([
    redis.get(rushHourUnlockKey(username)),
    redis.get(bestScoreKey(username)),
  ]);

  return c.json<PlayerStateResponse>({
    rushHourUnlocked: unlockFlag === '1',
    bestScore: bestScoreRaw ? parseInt(bestScoreRaw, 10) : 0,
  });
});

game.post('/score', async (c) => {
  const username = context.username;
  if (!username) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Must be signed in to submit a score' }, 401);
  }

  const body = await c.req.json<SubmitScoreRequest>();
  const score = Math.max(0, Math.floor(body.score));
  const date = todayDateString();
  const expiration = new Date(Date.now() + KEY_EXPIRY_SECONDS * 1000);

  // Daily leaderboard: only keep this player's best score for today.
  const leaderboardKeyToday = leaderboardKey(date);
  const existingTodayScore = await redis.zScore(leaderboardKeyToday, username);
  if (existingTodayScore === undefined || score > existingTodayScore) {
    await redis.zAdd(leaderboardKeyToday, { member: username, score });
    await redis.expire(leaderboardKeyToday, KEY_EXPIRY_SECONDS);
  }

  // All-time best score.
  const bestScoreRaw = await redis.get(bestScoreKey(username));
  const previousBest = bestScoreRaw ? parseInt(bestScoreRaw, 10) : 0;
  const isNewBest = score > previousBest;
  if (isNewBest) {
    await redis.set(bestScoreKey(username), String(score));
  }

  // Skill-gated Rush Hour unlock.
  const alreadyUnlocked = (await redis.get(rushHourUnlockKey(username))) === '1';
  if (!alreadyUnlocked && score >= RUSH_HOUR_UNLOCK_SCORE) {
    await redis.set(rushHourUnlockKey(username), '1');
  }
  const rushHourUnlocked = alreadyUnlocked || score >= RUSH_HOUR_UNLOCK_SCORE;

  // Reddit flair: Master Baker (permanent, all-time) takes priority over the
  // daily flair so a landmark run never gets clobbered by the daily one.
  let masterBakerAwarded = false;
  const alreadyHasMasterBaker = (await redis.get(masterBakerFlairKey(username))) === '1';
  if (!alreadyHasMasterBaker && score >= MASTER_BAKER_SCORE) {
    await redis.set(masterBakerFlairKey(username), '1');
    await reddit.setUserFlair({
      subredditName: context.subredditName,
      username,
      text: 'Master Baker',
    });
    masterBakerAwarded = true;
  } else if (!alreadyHasMasterBaker) {
    const rankInfo = await computeRank(leaderboardKeyToday, username);
    if (rankInfo?.rank === 1) {
      const holderKey = dailyTopHolderKey(date);
      const previousHolder = await redis.get(holderKey);
      if (previousHolder && previousHolder !== username) {
        await reddit.removeUserFlair(context.subredditName, previousHolder);
      }
      await reddit.setUserFlair({
        subredditName: context.subredditName,
        username,
        text: "Today's Top Baker",
      });
      await redis.set(holderKey, username, { expiration });
    }
  }

  const rankInfo = await computeRank(leaderboardKeyToday, username);

  return c.json<SubmitScoreResponse>({
    rank: rankInfo?.rank ?? 0,
    totalPlayers: rankInfo?.total ?? 0,
    isNewBest,
    bestScore: isNewBest ? score : previousBest,
    rushHourUnlocked,
    masterBakerAwarded,
  });
});
