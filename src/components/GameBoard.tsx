import { useEffect, useRef, useState } from 'react';
import {
  supabase,
  DailyPuzzle,
  UserProgress,
  UserStats,
  GuessFeedbackRecord
} from '../lib/supabase';
import {
  evaluateGuess,
  GuessFeedback,
  getUserId,
  getTodayDate
} from '../lib/gameLogic';
import { getUserStats, updateUserStats } from '../lib/stats';
import HintCard from './HintCard';
import GuessInput from './GuessInput';
import GuessList from './GuessList';
import RevealScreen from './RevealScreen';
import Header from './Header';
import GameStats from './GameStats';

const MAX_ATTEMPTS = 6;

type StatusTone = 'success' | 'info' | 'warning' | 'error';

const statusToneClasses: Record<StatusTone, string> = {
  success: 'bg-green-50 border-green-200 text-green-700',
  info: 'bg-amber-50 border-amber-200 text-amber-700',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  error: 'bg-rose-50 border-rose-200 text-rose-700'
};

interface ProgressMeta {
  firstGuessAt: string | null;
  lastGuessAt: string | null;
  timeSpentSeconds: number;
}

const toneMap = {
  correct: 'success',
  close: 'info',
  neutral: 'warning'
} as const;

export default function GameBoard() {
  const [puzzle, setPuzzle] = useState<DailyPuzzle | null>(null);
  const [guesses, setGuesses] = useState<GuessFeedback[]>([]);
  const [currentHintIndex, setCurrentHintIndex] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<StatusTone>('info');
  const [statsLoading, setStatsLoading] = useState(true);
  const [userStats, setUserStatsState] = useState<UserStats | null>(null);
  const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userIdRef = useRef<string>('');
  const firstGuessAtRef = useRef<string | null>(null);
  const lastGuessAtRef = useRef<string | null>(null);
  const timeSpentRef = useRef<number>(0);

  useEffect(() => {
    void loadTodayPuzzle();
  }, []);

  useEffect(() => {
    if (!statusMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setStatusMessage(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [statusMessage]);

  async function loadTodayPuzzle() {
    setLoading(true);
    const today = getTodayDate();
    const userId = getUserId();
    userIdRef.current = userId;

    try {
      const { data: puzzleData, error: puzzleError } = await supabase
        .from('daily_puzzles')
        .select('*')
        .eq('date', today)
        .maybeSingle();

      if (puzzleError) {
        console.error('Error loading puzzle:', puzzleError);
        setStatusTone('error');
        setStatusMessage('We could not load today’s sense. Please refresh and try again.');
        setPuzzle(null);
        return;
      }

      if (!puzzleData) {
        setStatusTone('warning');
        setStatusMessage('No puzzle available for today. Check back soon!');
        setPuzzle(null);
        return;
      }

      const resolvedPuzzle = puzzleData as DailyPuzzle;
      setPuzzle(resolvedPuzzle);

      await Promise.all([
        loadProgress(userId, today, resolvedPuzzle),
        loadStats(userId)
      ]);
    } catch (error) {
      console.error('Failed to initialise puzzle:', error);
      setStatusTone('error');
      setStatusMessage('We hit a snag getting things ready. Try reloading the page.');
    } finally {
      setLoading(false);
    }
  }

  async function loadProgress(userId: string, date: string, puzzleData: DailyPuzzle) {
    const { data: progressData, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('puzzle_date', date)
      .maybeSingle();

    if (error) {
      console.error('Error loading progress:', error);
      setStatusTone('error');
      setStatusMessage('We had trouble restoring your progress. You may need to try again.');
      resetSessionState();
      return;
    }

    if (!progressData) {
      resetSessionState();
      return;
    }

    const progress = progressData as UserProgress;
    const feedbackRecords = progress.guess_feedback ?? [];

    const storedGuesses: GuessFeedback[] = Array.isArray(feedbackRecords) && feedbackRecords.length > 0
      ? feedbackRecords.map(mapRecordToFeedback)
      : progress.guesses.map(guess =>
          evaluateGuess(guess, puzzleData.answer, puzzleData.synonyms, puzzleData.category)
        );

    setGuesses(storedGuesses);

    const maxHintIndex = Math.max(puzzleData.hints.length - 1, 0);
    const storedHintIndex = typeof progress.hint_index === 'number'
      ? Math.min(progress.hint_index, maxHintIndex)
      : Math.min(storedGuesses.length, maxHintIndex);

    setCurrentHintIndex(storedHintIndex);

    firstGuessAtRef.current = progress.first_guess_at ?? null;
    lastGuessAtRef.current = progress.last_guess_at ?? null;

    const storedTime = progress.time_spent_seconds ?? 0;
    timeSpentRef.current = storedTime;
    setTimeSpentSeconds(storedTime);

    if (progress.completed) {
      const won = storedGuesses.some(g => g.feedback === 'correct');
      setGameState(won ? 'won' : 'lost');
    } else {
      setGameState('playing');
    }
  }

  function resetSessionState() {
    setGuesses([]);
    setCurrentHintIndex(0);
    setGameState('playing');
    firstGuessAtRef.current = null;
    lastGuessAtRef.current = null;
    timeSpentRef.current = 0;
    setTimeSpentSeconds(0);
    setStatusMessage(null);
    setStatusTone('info');
  }

  function mapRecordToFeedback(record: GuessFeedbackRecord): GuessFeedback {
    return {
      guess: record.guess,
      feedback: record.feedback,
      similarity: record.similarity ?? 0,
      matchType: record.matchType ?? 'none',
      explanation: record.explanation ?? ''
    };
  }

  async function loadStats(userId: string) {
    setStatsLoading(true);
    try {
      const stats = await getUserStats(userId);
      setUserStatsState(stats);
    } finally {
      setStatsLoading(false);
    }
  }

  async function handleGuess(rawGuess: string) {
    if (!puzzle || gameState !== 'playing' || isSubmitting) return;

    const trimmedGuess = rawGuess.trim();

    if (!trimmedGuess) {
      setStatusTone('warning');
      setStatusMessage('Please enter a guess before submitting.');
      return;
    }

    if (guesses.length >= MAX_ATTEMPTS) {
      setStatusTone('warning');
      setStatusMessage('You’ve used every guess for today’s puzzle.');
      return;
    }

    if (guesses.some(g => g.guess.toLowerCase() === trimmedGuess.toLowerCase())) {
      setStatusTone('warning');
      setStatusMessage('You already tried that guess—mix it up!');
      return;
    }

    setIsSubmitting(true);

    try {
      const evaluation = evaluateGuess(trimmedGuess, puzzle.answer, puzzle.synonyms, puzzle.category);
      const updatedGuesses = [...guesses, evaluation];

      const now = new Date();
      if (!firstGuessAtRef.current) {
        firstGuessAtRef.current = now.toISOString();
      }
      lastGuessAtRef.current = now.toISOString();

      if (firstGuessAtRef.current) {
        const elapsedSeconds = Math.max(
          timeSpentRef.current,
          Math.floor((now.getTime() - new Date(firstGuessAtRef.current).getTime()) / 1000)
        );
        timeSpentRef.current = elapsedSeconds;
        setTimeSpentSeconds(elapsedSeconds);
      }

      const maxHintIndex = Math.max(puzzle.hints.length - 1, 0);
      const nextHintIndex = Math.min(updatedGuesses.length, maxHintIndex);

      setGuesses(updatedGuesses);
      setCurrentHintIndex(nextHintIndex);

      setStatusTone(toneMap[evaluation.feedback]);
      setStatusMessage(evaluation.explanation);

      const userId = userIdRef.current || getUserId();
      const today = getTodayDate();
      const completed =
        evaluation.feedback === 'correct' || updatedGuesses.length >= MAX_ATTEMPTS;

      await saveProgress(
        userId,
        today,
        updatedGuesses,
        completed,
        nextHintIndex,
        {
          firstGuessAt: firstGuessAtRef.current,
          lastGuessAt: lastGuessAtRef.current,
          timeSpentSeconds: timeSpentRef.current
        }
      );

      if (completed) {
        const won = evaluation.feedback === 'correct';
        setGameState(won ? 'won' : 'lost');

        setStatsLoading(true);
        const updatedStats = await updateUserStats(userId, {
          won,
          attempts: updatedGuesses.length,
          timeSpentSeconds: timeSpentRef.current,
          puzzleDate: today
        });

        if (updatedStats) {
          setUserStatsState(updatedStats);
          setStatsLoading(false);
        } else {
          await loadStats(userId);
        }
      }
    } catch (error) {
      console.error('Failed to process guess:', error);
      setStatusTone('error');
      setStatusMessage('We could not save your guess. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveProgress(
    userId: string,
    date: string,
    currentGuesses: GuessFeedback[],
    completed: boolean,
    hintIndex: number,
    meta: ProgressMeta
  ) {
    const guessStrings = currentGuesses.map(g => g.guess);
    const guessFeedbackPayload = currentGuesses.map(({ guess, feedback, similarity, matchType, explanation }) => ({
      guess,
      feedback,
      similarity,
      matchType,
      explanation
    }));

    const { error } = await supabase
      .from('user_progress')
      .upsert(
        {
          user_id: userId,
          puzzle_date: date,
          guesses: guessStrings,
          guess_feedback: guessFeedbackPayload,
          completed,
          attempts: currentGuesses.length,
          hint_index: hintIndex,
          first_guess_at: meta.firstGuessAt,
          last_guess_at: meta.lastGuessAt,
          time_spent_seconds: meta.timeSpentSeconds,
          completed_at: completed ? new Date().toISOString() : null
        },
        {
          onConflict: 'user_id,puzzle_date'
        }
      );

    if (error) {
      throw error;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center">
        <div className="text-amber-800 text-xl">Loading today&apos;s sense...</div>
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
        timeSpentSeconds={timeSpentSeconds}
        stats={userStats}
        statsLoading={statsLoading}
      />
    );
  }

  const hints = puzzle.hints.length > 0 ? puzzle.hints : ['No hints available yet.'];
  const safeHintIndex = Math.min(currentHintIndex, hints.length - 1);
  const currentHint = hints[safeHintIndex];
  const totalHints = hints.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <GameStats stats={userStats} loading={statsLoading} />
        </div>
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
            hint={currentHint}
            category={puzzle.category}
            hintNumber={safeHintIndex + 1}
            totalHints={totalHints}
          />
        </div>

        {statusMessage && (
          <div className={`mb-6 px-4 py-3 rounded-xl border ${statusToneClasses[statusTone]} shadow-sm`}>
            {statusMessage}
          </div>
        )}

        <GuessList guesses={guesses} />

        <GuessInput
          onGuess={handleGuess}
          disabled={guesses.length >= MAX_ATTEMPTS || isSubmitting}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}
