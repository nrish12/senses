import { createClient } from '@supabase/supabase-js';
import type { GuessFeedback } from './gameLogic';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface DailyPuzzle {
  id: string;
  date: string;
  answer: string;
  category: 'taste' | 'smell' | 'texture';
  hints: string[];
  synonyms: string[];
  fact: string;
}

export type GuessFeedbackRecord = Pick<
  GuessFeedback,
  'guess' | 'feedback' | 'similarity' | 'matchType' | 'explanation'
>;

export interface UserProgress {
  id: string;
  user_id: string;
  puzzle_date: string;
  guesses: string[];
  completed: boolean;
  attempts: number;
  completed_at?: string;
  hint_index?: number;
  first_guess_at?: string | null;
  last_guess_at?: string | null;
  time_spent_seconds?: number | null;
  guess_feedback?: GuessFeedbackRecord[] | null;
}

export interface UserStats {
  id: string;
  user_id: string;
  current_streak: number;
  max_streak: number;
  total_played: number;
  total_wins: number;
  total_losses?: number;
  win_rate?: number;
  average_attempts?: number;
  best_attempts?: number | null;
  last_played_at?: string | null;
  last_outcome?: 'won' | 'lost' | null;
  last_attempt_count?: number | null;
  last_puzzle_date?: string | null;
  total_time_spent_seconds?: number;
  updated_at?: string;
}
