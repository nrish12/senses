import { supabase, UserStats } from './supabase';

export async function updateUserStats(userId: string, won: boolean): Promise<void> {
  const { data: existingStats } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingStats) {
    const stats = existingStats as UserStats;
    const newStreak = won ? stats.current_streak + 1 : 0;
    const newMaxStreak = Math.max(stats.max_streak, newStreak);

    await supabase
      .from('user_stats')
      .update({
        current_streak: newStreak,
        max_streak: newMaxStreak,
        total_played: stats.total_played + 1,
        total_wins: won ? stats.total_wins + 1 : stats.total_wins,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
  } else {
    await supabase
      .from('user_stats')
      .insert({
        user_id: userId,
        current_streak: won ? 1 : 0,
        max_streak: won ? 1 : 0,
        total_played: 1,
        total_wins: won ? 1 : 0,
        updated_at: new Date().toISOString()
      });
  }
}

export async function getUserStats(userId: string): Promise<UserStats | null> {
  const { data } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  return data as UserStats | null;
}
