export function countWords(text: string): number {
  const matches = text.trim().match(/\S+/g);
  return matches ? matches.length : 0;
}

/** Splits on sentence-ending punctuation. Abbreviations are not special-cased. */
export function countSentences(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/[.!?]+(?:\s|$)/).map(part => part.trim()).filter(Boolean).length;
}

export function readingSeconds(text: string, wordsPerMinute = 200): number {
  return Math.max(1, Math.round((countWords(text) / wordsPerMinute) * 60));
}
