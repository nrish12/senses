import { useState, FormEvent } from 'react';
import { Loader2, Send } from 'lucide-react';

interface GuessInputProps {
  onGuess: (guess: string) => void;
  disabled: boolean;
  isSubmitting?: boolean;
}

export default function GuessInput({ onGuess, disabled, isSubmitting = false }: GuessInputProps) {
  const [input, setInput] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (input.trim() && !disabled && !isSubmitting) {
      onGuess(input.trim());
      setInput('');
    }
  }

  const buttonDisabled = disabled || !input.trim() || isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter your guess..."
          disabled={disabled}
          className="flex-1 px-6 py-4 rounded-xl border-2 border-amber-200 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:bg-gray-100 disabled:cursor-not-allowed text-lg"
        />
        <button
          type="submit"
          disabled={buttonDisabled}
          className="px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center gap-2 min-w-[150px] justify-center"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Guess
            </>
          )}
        </button>
      </div>
    </form>
  );
}
