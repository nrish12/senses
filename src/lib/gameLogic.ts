export type FeedbackType = 'correct' | 'close' | 'neutral';

export interface GuessFeedback {
  guess: string;
  feedback: FeedbackType;
}

export function calculateFeedback(
  guess: string,
  answer: string,
  synonyms: string[],
  category: string
): FeedbackType {
  const normalizedGuess = guess.toLowerCase().trim();
  const normalizedAnswer = answer.toLowerCase().trim();

  if (normalizedGuess === normalizedAnswer) {
    return 'correct';
  }

  const allRelated = [...synonyms, category].map(s => s.toLowerCase());

  if (allRelated.includes(normalizedGuess)) {
    return 'close';
  }

  if (normalizedAnswer.includes(normalizedGuess) || normalizedGuess.includes(normalizedAnswer)) {
    return 'close';
  }

  for (const syn of synonyms) {
    if (calculateSimilarity(normalizedGuess, syn.toLowerCase()) > 0.7) {
      return 'close';
    }
  }

  return 'neutral';
}

function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

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

  return `${title} ${result}\n\n${grid}\n\nPlay at: ${window.location.origin}`;
}
