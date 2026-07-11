import { truncate, formatDate, cn } from '@/lib/utils'

describe('utils', () => {
  describe('truncate', () => {
    it('returns original string if shorter than limit', () => {
      expect(truncate('hello', 10)).toBe('hello')
    })

    it('truncates and adds ellipsis', () => {
      expect(truncate('hello world', 8)).toBe('hello wo...')
    })

    it('handles exact length', () => {
      expect(truncate('hello', 5)).toBe('hello')
    })

    it('handles empty string', () => {
      expect(truncate('', 10)).toBe('')
    })

    it('handles Unicode characters', () => {
      expect(truncate('안녕하세요', 4)).toBe('안녕하세...')
    })
  })

  describe('formatDate', () => {
    it('formats Korean date', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const result = formatDate(date, 'ko')
      expect(result).toContain('2024')
      expect(result).toContain('1')
      expect(result).toContain('15')
    })

    it('formats English date', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const result = formatDate(date, 'en')
      expect(result).toContain('Jan')
      expect(result).toContain('15')
      expect(result).toContain('2024')
    })

    it('handles invalid dates', () => {
      const date = new Date('invalid')
      expect(formatDate(date, 'ko')).toBe('Invalid Date')
      expect(formatDate(date, 'en')).toBe('Invalid Date')
    })
  })

  describe('cn', () => {
    it('joins class names', () => {
      expect(cn('a', 'b', 'c')).toBe('a b c')
    })

    it('handles conditional classes', () => {
      expect(cn('base', true && 'conditional')).toBe('base conditional')
      expect(cn('base', false && 'conditional')).toBe('base')
    })

    it('handles objects', () => {
      expect(cn({ active: true, disabled: false })).toBe('active')
    })

    it('handles mixed arguments', () => {
      expect(cn('base', { active: true }, 'extra')).toBe('base active extra')
    })
  })
})