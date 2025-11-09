import { useState, useEffect } from 'react';
import { supabase, DailyPuzzle, UserProgress } from '../lib/supabase';
import { calculateFeedback, GuessFeedback, getUserId, getTodayDate } from '../lib/gameLogic';
import { updateUserStats } from '../lib/stats';
import HintCard from './HintCard';
import GuessInput from './GuessInput';
import GuessList from './GuessList';
import RevealScreen from './RevealScreen';
import Header from './Header';

const MAX_ATTEMPTS = 6;

export default function GameBoard() {
  const [puzzle, setPuzzle] = useState<DailyPuzzle | null>(null);
  const [guesses, setGuesses] = useState<GuessFeedback[]>([]);
  const [currentHintIndex, setCurrentHintIndex] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTodayPuzzle();
  }, []);

  async function loadTodayPuzzle() {
    const today = getTodayDate();
    const userId = getUserId();

    const { data: puzzleData, error: puzzleError } = await supabase
      .from('daily_puzzles')
      .select('*')
      .eq('date', today)
      .maybeSingle();

    if (puzzleError) {
      console.error('Error loading puzzle:', puzzleError);
      setLoading(false);
      return;
    }

    if (!puzzleData) {
      console.error('No puzzle found for today');
      setLoading(false);
      return;
    }

    setPuzzle(puzzleData as DailyPuzzle);

    const { data: progressData } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('puzzle_date', today)
      .maybeSingle();

    if (progressData) {
      const progress = progressData as UserProgress;
      const loadedGuesses: GuessFeedback[] = progress.guesses.map((guess: string) => ({
        guess,
        feedback: calculateFeedback(guess, puzzleData.answer, puzzleData.synonyms, puzzleData.category)
      }));
      setGuesses(loadedGuesses);
      setCurrentHintIndex(Math.min(loadedGuesses.length, puzzleData.hints.length - 1));

      if (progress.completed) {
        const won = loadedGuesses.some(g => g.feedback === 'correct');
        setGameState(won ? 'won' : 'lost');
      }
    }

    setLoading(false);
  }

  async function handleGuess(guess: string) {
    if (!puzzle || gameState !== 'playing') return;

    const feedback = calculateFeedback(guess, puzzle.answer, puzzle.synonyms, puzzle.category);
    const newGuesses = [...guesses, { guess, feedback }];
    setGuesses(newGuesses);

    const userId = getUserId();
    const today = getTodayDate();

    if (feedback === 'correct') {
      setGameState('won');
      await saveProgress(userId, today, newGuesses, true);
      await updateUserStats(userId, true);
    } else if (newGuesses.length >= MAX_ATTEMPTS) {
      setGameState('lost');
      await saveProgress(userId, today, newGuesses, true);
      await updateUserStats(userId, false);
    } else {
      setCurrentHintIndex(Math.min(newGuesses.length, puzzle.hints.length - 1));
      await saveProgress(userId, today, newGuesses, false);
    }
  }

  async function saveProgress(userId: string, date: string, currentGuesses: GuessFeedback[], completed: boolean) {
    const guessStrings = currentGuesses.map(g => g.guess);

    await supabase
      .from('user_progress')
      .upsert({
        user_id: userId,
        puzzle_date: date,
        guesses: guessStrings,
        completed,
        attempts: currentGuesses.length,
        completed_at: completed ? new Date().toISOString() : null
      }, {
        onConflict: 'user_id,puzzle_date'
      });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center">
        <div className="text-amber-800 text-xl">Loading today's sense...</div>
      </div>
    );
  }

  if (!puzzle) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center">
        <div className="text-amber-800 text-xl">No puzzle available for today.</div>
      </div>
    );
  }

  if (gameState !== 'playing') {
    return (
      <RevealScreen
        puzzle={puzzle}
        guesses={guesses}
        won={gameState === 'won'}
        attempts={guesses.length}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <div className="flex justify-center gap-2 mb-6">
            {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${
                  i < guesses.length
                    ? guesses[i].feedback === 'correct'
                      ? 'bg-green-500'
                      : guesses[i].feedback === 'close'
                      ? 'bg-yellow-500'
                      : 'bg-gray-400'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          <HintCard
            hint={puzzle.hints[currentHintIndex]}
            category={puzzle.category}
            hintNumber={currentHintIndex + 1}
            totalHints={puzzle.hints.length}
          />
        </div>

        <GuessList guesses={guesses} />

        <GuessInput
          onGuess={handleGuess}
          disabled={guesses.length >= MAX_ATTEMPTS}
        />
      </div>
    </div>
  );
}
