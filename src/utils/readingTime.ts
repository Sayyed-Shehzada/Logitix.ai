/**
 * Dynamic Reading Time Calculation Utility
 * Standards:
 * - Technical & executive documentation: ~200 words per minute (WPM).
 * - Accurately strips markdown & HTML for true linguistic word count.
 * - Computes total minutes, remaining minutes based on scroll progress, and word count.
 */

export interface ReadingTimeResult {
  minutes: number;
  remainingMinutes: number;
  wordCount: number;
  characterCount: number;
  formattedText: string;
  formattedRemaining: string;
}

export function calculateReadingTime(
  content: string | number | undefined | null,
  progressPercentage: number = 0,
  wordsPerMinute: number = 200
): ReadingTimeResult {
  let wordCount = 0;
  let characterCount = 0;

  if (typeof content === 'string') {
    // Strip HTML tags if any
    const strippedHtml = content.replace(/<[^>]*>/g, ' ');
    // Strip markdown formatting symbols for accurate plain text word count
    const cleanText = strippedHtml
      .replace(/```[\s\S]*?```/g, (match) => {
        // Keep code words but strip language tag
        return match.replace(/```[a-zA-Z0-9_-]*/g, ' ');
      })
      .replace(/[#*_~`>[\]()!+-]/g, ' ')
      .trim();

    characterCount = cleanText.length;
    wordCount = cleanText ? cleanText.split(/\s+/).filter(Boolean).length : 0;
  } else if (typeof content === 'number' && content > 0) {
    characterCount = Math.round(content);
    // Average word in technical English is ~5.5 chars
    wordCount = Math.round(content / 5.5);
  }

  let minutes = 1;
  if (wordCount > 100) {
    minutes = Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  } else if (wordCount > 0) {
    minutes = 1;
  } else {
    minutes = 0;
  }

  const clampedProgress = Math.min(100, Math.max(0, progressPercentage));
  const remainingMinutes =
    clampedProgress >= 98
      ? 0
      : minutes > 0
      ? Math.max(1, Math.ceil(minutes * (1 - clampedProgress / 100)))
      : 0;

  return {
    minutes,
    remainingMinutes,
    wordCount,
    characterCount,
    formattedText: minutes <= 1 ? '1 min read' : `${minutes} min read`,
    formattedRemaining: remainingMinutes <= 1 ? '1m left' : `${remainingMinutes}m left`,
  };
}
