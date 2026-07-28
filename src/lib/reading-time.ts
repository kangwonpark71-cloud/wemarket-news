/**
 * Reading Time Calculator
 * Estimates reading time for news articles.
 *
 * Korean text: ~400 characters/min (syllable-based reading speed)
 * English text: ~200 words/min
 * Mixed content: detected by character ratio
 */

export function calculateReadingTime(text: string, language: string = 'ko'): number {
  if (!text || text.trim().length === 0) return 1

  const clean = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

  if (language === 'ko') {
    // Korean: count characters (excluding spaces)
    const charCount = clean.replace(/\s/g, '').length
    const minutes = Math.ceil(charCount / 400)
    return Math.max(1, minutes)
  }

  // English: count words
  const wordCount = clean.split(/\s+/).filter(Boolean).length
  const minutes = Math.ceil(wordCount / 200)
  return Math.max(1, minutes)
}

export function formatReadingTime(minutes: number): string {
  if (minutes <= 1) return '1분'
  return `${minutes}분`
}
