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
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Your Guesses</h3>
      {guesses.map((guess, index) => (
        <div
          key={index}
          className={`px-3 py-2 rounded-lg border ${
            feedbackStyles[guess.feedback]
          } transition-all`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm capitalize truncate">{guess.guess}</span>
                {guess.similarity > 0 && (
                  <span className="text-xs text-gray-600 whitespace-nowrap">
                    {Math.round(guess.similarity * 100)}%
                  </span>
                )}
              </div>
              {guess.explanation && (
                <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{guess.explanation}</p>
              )}
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
              {feedbackLabels[guess.feedback]}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
