import { GuessFeedback } from '../lib/gameLogic';

interface GuessListProps {
  guesses: GuessFeedback[];
}

const feedbackStyles = {
  correct: 'bg-green-100 border-green-400 text-green-800',
  close: 'bg-yellow-100 border-yellow-400 text-yellow-800',
  neutral: 'bg-gray-100 border-gray-300 text-gray-700'
};

const feedbackLabels = {
  correct: 'Correct',
  close: 'Close',
  neutral: 'Not quite'
};

export default function GuessList({ guesses }: GuessListProps) {
  if (guesses.length === 0) return null;

  return (
    <div className="space-y-3 mt-6">
      {guesses.map((guess, index) => (
        <div
          key={index}
          className={`flex items-center justify-between px-6 py-4 rounded-xl border-2 ${
            feedbackStyles[guess.feedback]
          } transition-all`}
        >
          <span className="font-medium text-lg">{guess.guess}</span>
          <span className="text-sm font-semibold uppercase tracking-wider">
            {feedbackLabels[guess.feedback]}
          </span>
        </div>
      ))}
    </div>
  );
}
