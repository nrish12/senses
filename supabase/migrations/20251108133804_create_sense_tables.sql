/*
  # Create SENSE Game Schema

  ## Tables Created
  
  1. **daily_puzzles**
     - `id` (uuid, primary key)
     - `date` (date, unique) - The puzzle date
     - `answer` (text) - The correct answer
     - `category` (text) - taste, smell, or texture
     - `hints` (jsonb) - Array of progressive hints
     - `synonyms` (jsonb) - Array of related words for proximity scoring
     - `fact` (text) - Fun fact about the answer
     - `created_at` (timestamp)

  2. **user_progress**
     - `id` (uuid, primary key)
     - `user_id` (text) - Anonymous user identifier (localStorage)
     - `puzzle_date` (date) - Reference to puzzle
     - `guesses` (jsonb) - Array of user guesses
     - `completed` (boolean) - Whether puzzle was solved
     - `attempts` (integer) - Number of guesses made
     - `completed_at` (timestamp)
     - `created_at` (timestamp)

  3. **user_stats**
     - `id` (uuid, primary key)
     - `user_id` (text, unique) - Anonymous user identifier
     - `current_streak` (integer) - Current daily streak
     - `max_streak` (integer) - Best streak ever
     - `total_played` (integer) - Total puzzles attempted
     - `total_wins` (integer) - Total puzzles solved
     - `updated_at` (timestamp)

  ## Security
  - Enable RLS on all tables
  - Public read access for daily_puzzles
  - User-specific access for progress and stats based on user_id
*/

-- Create daily_puzzles table
CREATE TABLE IF NOT EXISTS daily_puzzles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date UNIQUE NOT NULL,
  answer text NOT NULL,
  category text NOT NULL CHECK (category IN ('taste', 'smell', 'texture')),
  hints jsonb NOT NULL DEFAULT '[]'::jsonb,
  synonyms jsonb NOT NULL DEFAULT '[]'::jsonb,
  fact text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create user_progress table
CREATE TABLE IF NOT EXISTS user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  puzzle_date date NOT NULL,
  guesses jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed boolean DEFAULT false,
  attempts integer DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, puzzle_date)
);

-- Create user_stats table
CREATE TABLE IF NOT EXISTS user_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text UNIQUE NOT NULL,
  current_streak integer DEFAULT 0,
  max_streak integer DEFAULT 0,
  total_played integer DEFAULT 0,
  total_wins integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE daily_puzzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Policies for daily_puzzles (public read)
CREATE POLICY "Anyone can view daily puzzles"
  ON daily_puzzles FOR SELECT
  USING (true);

-- Policies for user_progress
CREATE POLICY "Users can view own progress"
  ON user_progress FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own progress"
  ON user_progress FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own progress"
  ON user_progress FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policies for user_stats
CREATE POLICY "Users can view own stats"
  ON user_stats FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own stats"
  ON user_stats FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own stats"
  ON user_stats FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_puzzles_date ON daily_puzzles(date);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_date ON user_progress(user_id, puzzle_date);
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);