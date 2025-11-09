-- Enhance progress tracking with richer telemetry

-- User progress additions
ALTER TABLE user_progress
  ADD COLUMN IF NOT EXISTS hint_index integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_guess_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_guess_at timestamptz,
  ADD COLUMN IF NOT EXISTS time_spent_seconds integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS guess_feedback jsonb DEFAULT '[]'::jsonb;

UPDATE user_progress
  SET hint_index = COALESCE(hint_index, 0),
      time_spent_seconds = COALESCE(time_spent_seconds, 0),
      guess_feedback = COALESCE(guess_feedback, '[]'::jsonb);

ALTER TABLE user_progress
  ALTER COLUMN hint_index SET NOT NULL,
  ALTER COLUMN time_spent_seconds SET NOT NULL;

-- User stats additions
ALTER TABLE user_stats
  ADD COLUMN IF NOT EXISTS total_losses integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS win_rate numeric(6,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_attempts numeric(6,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_attempts integer,
  ADD COLUMN IF NOT EXISTS last_played_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_outcome text,
  ADD COLUMN IF NOT EXISTS last_attempt_count integer,
  ADD COLUMN IF NOT EXISTS last_puzzle_date date,
  ADD COLUMN IF NOT EXISTS total_time_spent_seconds bigint DEFAULT 0;

UPDATE user_stats
  SET total_losses = COALESCE(total_losses, GREATEST(total_played - total_wins, 0)),
      win_rate = CASE
        WHEN total_played > 0 THEN ROUND((total_wins::numeric / total_played::numeric) * 100, 2)
        ELSE 0
      END,
      average_attempts = COALESCE(average_attempts, 0),
      total_time_spent_seconds = COALESCE(total_time_spent_seconds, 0);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_stats_last_outcome_check'
      AND conrelid = 'user_stats'::regclass
  ) THEN
    ALTER TABLE user_stats
      ADD CONSTRAINT user_stats_last_outcome_check
        CHECK (last_outcome IS NULL OR last_outcome IN ('won', 'lost'));
  END IF;
END
$$;
