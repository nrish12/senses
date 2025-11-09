import { createClient } from '@supabase/supabase-js';

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

export interface UserProgress {
  id: string;
  user_id: string;
  puzzle_date: string;
  guesses: string[];
  completed: boolean;
  attempts: number;
  completed_at?: string;
}

export interface UserStats {
  id: string;
  user_id: string;
  current_streak: number;
  max_streak: number;
  total_played: number;
  total_wins: number;
}
