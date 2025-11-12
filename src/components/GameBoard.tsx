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
import DevTools from './DevTools';

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
  const skipLoadProgressRef = useRef<boolean>(false);

  useEffect(() => {
    void loadTodayPuzzle();
  }, []);

  const handleForceNewPuzzle = (skipProgress = false) => {
    console.log('[GameBoard] handleForceNewPuzzle called, current gameState:', gameState, 'skipProgress:', skipProgress);

    // Set flag to skip loading progress if requested
    skipLoadProgressRef.current = skipProgress;

    // Reset all state immediately to ensure clean slate
    setLoading(true);
    setPuzzle(null);
    setGameState('playing');
    setGuesses([]);
    setCurrentHintIndex(0);
    setStatusMessage(null);
    setTimeSpentSeconds(0);
    firstGuessAtRef.current = null;
    lastGuessAtRef.current = null;
    timeSpentRef.current = 0;

    console.log('[GameBoard] State reset complete, will reload puzzle');

    // Small delay to ensure state updates, then reload
    setTimeout(() => {
      console.log('[GameBoard] Calling loadTodayPuzzle');
      void loadTodayPuzzle();
    }, 10);
  };

  useEffect(() => {
    if (!statusMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setStatusMessage(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [statusMessage]);

  async function loadTodayPuzzle() {
    console.log('[GameBoard] loadTodayPuzzle starting');
    setLoading(true);
    resetSessionState();
    const today = getTodayDate();
    const userId = getUserId();
    userIdRef.current = userId;

    console.log('[GameBoard] Loading puzzle for date:', today, 'userId:', userId);

    try {
      const { data: puzzleData, error: puzzleError } = await supabase
        .from('daily_puzzles')
        .select('*')
        .eq('date', today)
        .maybeSingle();

      if (puzzleError) {
        console.error('Error loading puzzle:', puzzleError);
        setStatusTone('error');
        setStatusMessage('We could not load today\'s sense. Please refresh and try again.');
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
      console.log('[GameBoard] Puzzle loaded:', resolvedPuzzle.answer);
      setPuzzle(resolvedPuzzle);

      await Promise.all([
        loadProgress(userId, today, resolvedPuzzle),
        loadStats(userId)
      ]);

      console.log('[GameBoard] loadTodayPuzzle complete');
    } catch (error) {
      console.error('Failed to initialise puzzle:', error);
      setStatusTone('error');
      setStatusMessage('We hit a snag getting things ready. Try reloading the page.');
    } finally {
      setLoading(false);
    }
  }

  async function loadProgress(userId: string, date: string, puzzleData: DailyPuzzle) {
    console.log('[GameBoard] loadProgress starting for date:', date, 'skipLoadProgress:', skipLoadProgressRef.current);

    // If we're skipping progress (e.g., after a forced reset), just reset and return
    if (skipLoadProgressRef.current) {
      console.log('[GameBoard] Skipping progress load as requested');
      skipLoadProgressRef.current = false; // Reset the flag
      resetSessionState();
      return;
    }

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
      console.log('[GameBoard] No progress found - starting fresh');
      resetSessionState();
      return;
    }

    const progress = progressData as UserProgress;
    console.log('[GameBoard] Progress found:', {
      completed: progress.completed,
      attempts: progress.attempts,
      guesses: progress.guesses
    });
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
      console.log('[GameBoard] Progress was completed, setting gameState to:', won ? 'won' : 'lost');
      setGameState(won ? 'won' : 'lost');
    } else {
      console.log('[GameBoard] Progress not completed, setting gameState to: playing');
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

      setGuesses(updatedGuesses);

      const maxHintIndex = Math.max(puzzle.hints.length - 1, 0);
      const nextHintIndex = evaluation.feedback !== 'correct'
        ? Math.min(updatedGuesses.length, maxHintIndex)
        : currentHintIndex;

      if (evaluation.feedback !== 'correct') {
        setCurrentHintIndex(nextHintIndex);
      }

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

        setTimeout(() => {
          setGameState(won ? 'won' : 'lost');
        }, 100);
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
        onForceNewPuzzle={handleForceNewPuzzle}
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
      <div className="container mx-auto px-4 py-4 max-w-4xl">
        <div className="mb-3">
          <GameStats stats={userStats} loading={statsLoading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-3">
          <div>
            <div className="flex justify-center gap-2 mb-3">
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

            {statusMessage && (
              <div className={`mt-3 px-3 py-2 rounded-xl border text-sm ${statusToneClasses[statusTone]} shadow-sm`}>
                {statusMessage}
              </div>
            )}

            <div className="mt-3">
              <GuessInput
                onGuess={handleGuess}
                disabled={guesses.length >= MAX_ATTEMPTS || isSubmitting}
                isSubmitting={isSubmitting}
              />
            </div>
          </div>

          <div className="lg:max-h-[calc(100vh-200px)] lg:overflow-y-auto">
            <GuessList guesses={guesses} />
          </div>
        </div>
      </div>
      <DevTools onForceNewPuzzle={handleForceNewPuzzle} />
    </div>
  );
}
