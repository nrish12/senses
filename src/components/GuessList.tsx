import { GuessFeedback } from '../lib/gameLogic';

interface GuessListProps {
  guesses: GuessFeedback[];
}

const feedbackStyles = {
  correct: 'bg-green-100 border-green-300 text-green-800',
  close: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  neutral: 'bg-gray-100 border-gray-300 text-gray-700'
};

const feedbackLabels = {
  correct: 'Correct',
  close: 'Close',
  neutral: 'Not quite'
};

const matchTypeLabels = {
  exact: 'Exact match',
  synonym: 'Synonym match',
  category: 'Category match',
  substring: 'Shared letters',
  fuzzy: 'Fuzzy match',
  none: ''
} as const;

export default function GuessList({ guesses }: GuessListProps) {
  if (guesses.length === 0) return null;

  return (
    <div className="space-y-4 mt-6">
      {guesses.map((guess, index) => (
        <div
          key={index}
          className={`px-6 py-4 rounded-xl border-2 ${
            feedbackStyles[guess.feedback]
          } transition-all`}
        >
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <span className="font-semibold text-lg capitalize">{guess.guess}</span>
              {guess.explanation && (
                <p className="text-sm text-gray-700 mt-1">{guess.explanation}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                {guess.matchType !== 'none' && matchTypeLabels[guess.matchType] && (
                  <span className="inline-flex items-center rounded-full bg-white/70 px-3 py-1 border border-white/60">
                    {matchTypeLabels[guess.matchType]}
                  </span>
                )}
                {guess.similarity > 0 && (
                  <span className="inline-flex items-center rounded-full bg-white/70 px-3 py-1 border border-white/60">
                    {Math.round(guess.similarity * 100)}% similar
                  </span>
                )}
              </div>
            </div>
            <span className="text-sm font-semibold uppercase tracking-wider whitespace-nowrap">
              {feedbackLabels[guess.feedback]}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
