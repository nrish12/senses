import { supabase, UserStats } from './supabase';

export interface UpdateUserStatsPayload {
  won: boolean;
  attempts: number;
  timeSpentSeconds: number;
  puzzleDate: string;
}

export async function updateUserStats(
  userId: string,
  { won, attempts, timeSpentSeconds, puzzleDate }: UpdateUserStatsPayload
): Promise<UserStats | null> {
  const now = new Date().toISOString();
  const sanitizedAttempts = Math.max(1, Math.floor(attempts));
  const sanitizedTime = Math.max(0, Math.round(timeSpentSeconds));

  const { data: existingStats, error: fetchError } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    console.error('Failed to load user stats:', fetchError);
    return null;
  }

  if (existingStats && existingStats.last_puzzle_date === puzzleDate) {
    return existingStats as UserStats;
  }

  const stats = existingStats as UserStats | null;
  const previousTotalPlayed = stats?.total_played ?? 0;
  const previousWins = stats?.total_wins ?? 0;
  const previousStreak = stats?.current_streak ?? 0;
  const previousMaxStreak = stats?.max_streak ?? 0;
  const previousBestAttempts = stats?.best_attempts ?? null;
  const previousAverageAttempts = stats?.average_attempts ?? 0;
  const previousTotalTime = stats?.total_time_spent_seconds ?? 0;

  const totalPlayed = previousTotalPlayed + 1;
  const totalWins = won ? previousWins + 1 : previousWins;
  const totalLosses = totalPlayed - totalWins;
  const currentStreak = won ? previousStreak + 1 : 0;
  const maxStreak = Math.max(previousMaxStreak, currentStreak);

  const averageAttempts =
    ((previousAverageAttempts * previousTotalPlayed) + sanitizedAttempts) / totalPlayed;
  const winRate = totalPlayed === 0 ? 0 : (totalWins / totalPlayed) * 100;
  const bestAttempts = won
    ? previousBestAttempts === null
      ? sanitizedAttempts
      : Math.min(previousBestAttempts, sanitizedAttempts)
    : previousBestAttempts;
  const totalTimeSpentSeconds = previousTotalTime + sanitizedTime;

  const { data: updatedStats, error: upsertError } = await supabase
    .from('user_stats')
    .upsert(
      {
        user_id: userId,
        current_streak: currentStreak,
        max_streak: maxStreak,
        total_played: totalPlayed,
        total_wins: totalWins,
        total_losses: totalLosses,
        win_rate: Number(winRate.toFixed(2)),
        average_attempts: Number(averageAttempts.toFixed(2)),
        best_attempts: bestAttempts,
        last_played_at: now,
        last_outcome: won ? 'won' : 'lost',
        last_attempt_count: sanitizedAttempts,
        last_puzzle_date: puzzleDate,
        total_time_spent_seconds: totalTimeSpentSeconds,
        updated_at: now
      },
      { onConflict: 'user_id' }
    )
    .select()
    .maybeSingle();

  if (upsertError) {
    console.error('Failed to update user stats:', upsertError);
    return stats;
  }

  return updatedStats ? (normalizeStats(updatedStats as UserStats) as UserStats) : stats;
}

export async function getUserStats(userId: string): Promise<UserStats | null> {
  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch user stats:', error);
    return null;
  }

  return data ? normalizeStats(data as UserStats) : null;
}

function normalizeStats(stats: UserStats): UserStats {
  const totalLosses = stats.total_losses ?? Math.max(stats.total_played - stats.total_wins, 0);
  const winRate =
    stats.win_rate ?? (stats.total_played === 0 ? 0 : (stats.total_wins / stats.total_played) * 100);
  const averageAttempts = stats.average_attempts ?? 0;

  return {
    ...stats,
    total_losses: totalLosses,
    win_rate: Number(winRate.toFixed(2)),
    average_attempts: Number(averageAttempts.toFixed(2))
  };
}
