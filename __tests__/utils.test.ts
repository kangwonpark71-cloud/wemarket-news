import { formatDate, truncate, cn } from '@/lib/utils'

describe('utils', () => {
  describe('formatDate', () => {
    it('formats Korean date correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const result = formatDate(date, 'ko')
      expect(result).toContain('2024')
      expect(result).toContain('1')
      expect(result).toContain('15')
    })

    it('formats English date correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const result = formatDate(date, 'en')
      expect(result).toContain('2024')
      expect(result).toContain('Jan')
    })

    it('handles invalid date gracefully', () => {
      const date = new Date('invalid')
      const result = formatDate(date, 'ko')
      expect(typeof result).toBe('string')
    })
  })

  describe('truncate', () => {
    it('truncates long strings', () => {
      const str = 'a'.repeat(100)
      const result = truncate(str, 50)
      expect(result.length).toBe(53)
      expect(result.endsWith('...')).toBe(true)
    })

    it('returns original string if shorter than limit', () => {
      const str = 'short'
      const result = truncate(str, 50)
      expect(result).toBe('short')
    })

    it('handles empty string', () => {
      const result = truncate('', 50)
      expect(result).toBe('')
    })

    it('handles exact length', () => {
      const str = 'a'.repeat(50)
      const result = truncate(str, 50)
      expect(result).toBe(str)
    })
  })

  describe('cn', () => {
    it('joins class names', () => {
      expect(cn('a', 'b', 'c')).toBe('a b c')
    })

    it('handles conditional classes', () => {
      expect(cn('base', true && 'conditional', false && 'hidden')).toBe('base conditional')
    })

    it('handles empty values', () => {
      expect(cn('', 'a', null, undefined, 'b')).toBe('a b')
    })
  })
})