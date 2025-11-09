export type FeedbackType = 'correct' | 'close' | 'neutral';
export type MatchType = 'exact' | 'synonym' | 'category' | 'substring' | 'fuzzy' | 'none';

export interface GuessFeedback {
  guess: string;
  feedback: FeedbackType;
  similarity: number;
  matchType: MatchType;
  explanation: string;
}

const STRONG_MATCH_THRESHOLD = 0.82;
const WEAK_MATCH_THRESHOLD = 0.68;

export function evaluateGuess(
  guess: string,
  answer: string,
  synonyms: string[],
  category: string
): GuessFeedback {
  const rawGuess = guess.trim();
  const normalizedGuess = normalizeText(rawGuess);
  const normalizedAnswer = normalizeText(answer);
  const normalizedCategory = normalizeText(category);
  const normalizedSynonyms = synonyms.map(normalizeText).filter(Boolean);

  if (!normalizedGuess) {
    return {
      guess: rawGuess,
      feedback: 'neutral',
      similarity: 0,
      matchType: 'none',
      explanation: 'Enter a guess to begin exploring the sense.'
    };
  }

  if (normalizedGuess === normalizedAnswer) {
    return {
      guess: rawGuess,
      feedback: 'correct',
      similarity: 1,
      matchType: 'exact',
      explanation: 'Perfect match! You identified the answer exactly.'
    };
  }

  if (normalizedSynonyms.includes(normalizedGuess)) {
    return {
      guess: rawGuess,
      feedback: 'close',
      similarity: 0.92,
      matchType: 'synonym',
      explanation: 'That matches one of the official synonyms for the answer.'
    };
  }

  if (normalizedCategory && normalizedGuess.includes(normalizedCategory)) {
    return {
      guess: rawGuess,
      feedback: 'close',
      similarity: 0.7,
      matchType: 'category',
      explanation: 'You are aligned with the correct sensory category.'
    };
  }

  if (normalizedAnswer.includes(normalizedGuess) || normalizedGuess.includes(normalizedAnswer)) {
    return {
      guess: rawGuess,
      feedback: 'close',
      similarity: 0.75,
      matchType: 'substring',
      explanation: 'Great instinct—your guess shares key letters with the answer.'
    };
  }

  const answerSimilarity = calculateSimilarity(normalizedGuess, normalizedAnswer);
  const synonymSimilarity = normalizedSynonyms.reduce(
    (acc, syn) => Math.max(acc, calculateSimilarity(normalizedGuess, syn)),
    0
  );

  const bestSimilarity = Math.max(answerSimilarity, synonymSimilarity);

  if (bestSimilarity >= STRONG_MATCH_THRESHOLD) {
    return {
      guess: rawGuess,
      feedback: 'close',
      similarity: bestSimilarity,
      matchType: 'fuzzy',
      explanation: `Very close! Your guess is about ${Math.round(bestSimilarity * 100)}% similar to the answer.`
    };
  }

  if (bestSimilarity >= WEAK_MATCH_THRESHOLD) {
    return {
      guess: rawGuess,
      feedback: 'close',
      similarity: bestSimilarity,
      matchType: 'fuzzy',
      explanation: `Good progress—your guess shares a lot with the answer (${Math.round(bestSimilarity * 100)}% similar).`
    };
  }

  const categoryTokens = tokenize(normalizedCategory);
  if (categoryTokens.some(token => token && normalizedGuess.includes(token))) {
    return {
      guess: rawGuess,
      feedback: 'close',
      similarity: 0.65,
      matchType: 'category',
      explanation: 'You are thinking in the right sensory lane—keep going!'
    };
  }

  return {
    guess: rawGuess,
    feedback: 'neutral',
    similarity: bestSimilarity,
    matchType: 'none',
    explanation: 'No strong connection yet. Try a different angle or sense descriptor.'
  };
}

export function calculateFeedback(
  guess: string,
  answer: string,
  synonyms: string[],
  category: string
): FeedbackType {
  return evaluateGuess(guess, answer, synonyms, category).feedback;
}

export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '—';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  }

  return `${seconds}s`;
}

function normalizeText(value: string): string {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value: string): string[] {
  return value
    .split(/\s+/)
    .map(token => token.trim())
    .filter(Boolean);
}

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

export function getUserId(): string {
  let userId = localStorage.getItem('sense_user_id');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('sense_user_id', userId);
  }
  return userId;
}

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function generateShareText(
  attempts: number,
  maxAttempts: number,
  feedbacks: GuessFeedback[],
  won: boolean
): string {
  const today = getTodayDate();
  const title = `SENSE ${today}`;
  const result = won ? `${attempts}/${maxAttempts}` : 'X/6';

  const grid = feedbacks.map(f => {
    switch (f.feedback) {
      case 'correct': return '🟩';
      case 'close': return '🟨';
      case 'neutral': return '⬜';
    }
  }).join('');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const attribution = origin ? `\n\nPlay at: ${origin}` : '';

  return `${title} ${result}\n\n${grid}${attribution}`;
}
