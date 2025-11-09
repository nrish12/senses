import { useState } from 'react';
import { Share2, Sparkles, TrendingUp } from 'lucide-react';
import { DailyPuzzle } from '../lib/supabase';
import { GuessFeedback, generateShareText } from '../lib/gameLogic';
import Header from './Header';

interface RevealScreenProps {
  puzzle: DailyPuzzle;
  guesses: GuessFeedback[];
  won: boolean;
  attempts: number;
}

const categoryEmojis = {
  taste: '👅',
  smell: '👃',
  texture: '✋'
};

export default function RevealScreen({ puzzle, guesses, won, attempts }: RevealScreenProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareText = generateShareText(attempts, 6, guesses, won);

    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  const categoryEmoji = categoryEmojis[puzzle.category as keyof typeof categoryEmojis] || '🎯';

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm px-8 py-4 rounded-2xl shadow-lg mb-6">
            <Sparkles className={`w-8 h-8 ${won ? 'text-green-500' : 'text-orange-500'}`} />
            <h2 className={`text-3xl font-bold ${won ? 'text-green-600' : 'text-orange-600'}`}>
              {won ? 'Sensational!' : 'Nice Try!'}
            </h2>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-10 mb-6">
            <div className="text-6xl mb-4">{categoryEmoji}</div>
            <p className="text-gray-600 text-sm uppercase tracking-wider mb-2">
              The answer was
            </p>
            <h3 className="text-5xl font-bold text-amber-600 mb-6 capitalize">
              {puzzle.answer}
            </h3>

            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 mb-6">
              <p className="text-gray-700 text-lg leading-relaxed italic">
                {puzzle.fact}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-gray-600 mb-6">
              <TrendingUp className="w-5 h-5" />
              <span className="font-semibold">
                Solved in {attempts} {attempts === 1 ? 'guess' : 'guesses'}
              </span>
            </div>

            <div className="flex justify-center gap-2 mb-4">
              {guesses.map((guess, i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl"
                >
                  {guess.feedback === 'correct' && '🟩'}
                  {guess.feedback === 'close' && '🟨'}
                  {guess.feedback === 'neutral' && '⬜'}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold text-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl"
          >
            <Share2 className="w-5 h-5" />
            {copied ? 'Copied!' : 'Share Results'}
          </button>

          <p className="text-gray-600 text-sm mt-6">
            Come back tomorrow for a new sense to discover
          </p>
        </div>
      </div>
    </div>
  );
}
