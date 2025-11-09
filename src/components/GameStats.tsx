import { UserStats } from '../lib/supabase';
import { formatDuration } from '../lib/gameLogic';

interface GameStatsProps {
  stats: UserStats | null;
  loading: boolean;
}

const skeletonCells = Array.from({ length: 4 });

export default function GameStats({ stats, loading }: GameStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {skeletonCells.map((_, index) => (
          <div
            key={index}
            className="h-20 rounded-2xl bg-white/60 border border-white/70 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-2xl bg-white/70 border border-white/80 px-5 py-4 text-sm text-amber-700">
        Play today&apos;s puzzle to start building your streak and stats.
      </div>
    );
  }

  const totalPlayed = stats.total_played ?? 0;
  const totalWins = stats.total_wins ?? 0;
  const winRate = totalPlayed > 0 ? Math.round((totalWins / totalPlayed) * 100) : 0;
  const averageAttempts = stats.average_attempts ?? 0;
  const bestAttempts = stats.best_attempts ?? null;
  const totalTime = stats.total_time_spent_seconds ?? 0;
  const lastOutcome = stats.last_outcome;
  const lastPlayedAt = stats.last_played_at
    ? new Date(stats.last_played_at)
    : null;

  const winRateHelper =
    totalPlayed > 0 ? `${totalWins}/${totalPlayed} wins` : 'No games yet';
  const averageAttemptsHelper = bestAttempts ? `Best ${bestAttempts}` : '—';
  const timePlayedValue = formatDuration(totalTime);
  const timeHelperParts: string[] = [];

  if (lastOutcome) {
    timeHelperParts.push(capitalize(lastOutcome));
  }
  if (lastPlayedAt) {
    timeHelperParts.push(formatShortDate(lastPlayedAt));
  }

  const timeHelper = timeHelperParts.length > 0 ? timeHelperParts.join(' • ') : '—';

  const metrics = [
    {
      label: 'Current Streak',
      value: stats.current_streak ?? 0,
      helper: `Max ${stats.max_streak ?? 0}`
    },
    {
      label: 'Win Rate',
      value: totalPlayed > 0 ? `${winRate}%` : '—',
      helper: winRateHelper
    },
    {
      label: 'Avg Attempts',
      value: totalWins > 0 ? averageAttempts.toFixed(1) : '—',
      helper: averageAttemptsHelper
    },
    {
      label: 'Time Played',
      value: timePlayedValue,
      helper: timeHelper
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {metrics.map(({ label, value, helper }) => (
        <div
          key={label}
          className="rounded-2xl bg-white/80 border border-white/70 px-4 py-3 shadow-sm flex flex-col gap-1"
        >
          <span className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
            {label}
          </span>
          <span className="text-xl font-bold text-amber-700">
            {value}
          </span>
          <span className="text-xs text-gray-500">
            {helper}
          </span>
        </div>
      ))}
    </div>
  );
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });
}
