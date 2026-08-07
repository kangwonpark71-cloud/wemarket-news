import { formatDate, truncate, cn, getSiteUrl, absoluteUrl, sendNotificationWebhook, estimateReadingTime } from '@/lib/utils'
import { withMockEnv, withMockEnvAsync } from '@/lib/test-utils'

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

    it('accepts ISO string input', () => {
      const result = formatDate('2024-01-15T10:30:00Z', 'ko')
      expect(typeof result).toBe('string')
    })

    describe('relative time (ko)', () => {
      beforeEach(() => {
        jest.useFakeTimers()
        jest.setSystemTime(new Date('2024-01-15T10:30:00Z'))
      })

      afterEach(() => {
        jest.useRealTimers()
      })

      it('returns 방금 전 within a minute', () => {
        expect(formatDate(new Date('2024-01-15T10:29:30Z'), 'ko')).toBe('방금 전')
      })

      it('returns N분 전 within an hour', () => {
        expect(formatDate(new Date('2024-01-15T10:25:00Z'), 'ko')).toBe('5분 전')
      })

      it('returns N시간 전 within a day', () => {
        expect(formatDate(new Date('2024-01-15T08:30:00Z'), 'ko')).toBe('2시간 전')
      })

      it('returns N일 전 within a week', () => {
        expect(formatDate(new Date('2024-01-12T10:30:00Z'), 'ko')).toBe('3일 전')
      })

      it('falls back to locale date string after 7 days', () => {
        const result = formatDate(new Date('2024-01-05T10:30:00Z'), 'ko')
        expect(result).toContain('2024')
        expect(result).toContain('1')
      })
    })

    describe('relative time (en)', () => {
      beforeEach(() => {
        jest.useFakeTimers()
        jest.setSystemTime(new Date('2024-01-15T10:30:00Z'))
      })

      afterEach(() => {
        jest.useRealTimers()
      })

      it('returns just now within a minute', () => {
        expect(formatDate(new Date('2024-01-15T10:29:30Z'), 'en')).toBe('just now')
      })

      it('returns Nm ago within an hour', () => {
        expect(formatDate(new Date('2024-01-15T10:25:00Z'), 'en')).toBe('5m ago')
      })

      it('returns Nh ago within a day', () => {
        expect(formatDate(new Date('2024-01-15T08:30:00Z'), 'en')).toBe('2h ago')
      })

      it('returns Nd ago within a week', () => {
        expect(formatDate(new Date('2024-01-12T10:30:00Z'), 'en')).toBe('3d ago')
      })

      it('falls back to locale date string after 7 days', () => {
        const result = formatDate(new Date('2024-01-05T10:30:00Z'), 'en')
        expect(result).toContain('2024')
        expect(result).toContain('Jan')
      })
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

  describe('getSiteUrl', () => {
    it('returns base URL without trailing slash when env is set', () => {
      withMockEnv({ NEXT_PUBLIC_BASE_URL: 'https://example.com/' }, () => {
        expect(getSiteUrl()).toBe('https://example.com')
      })
    })

    it('returns base URL as-is when env has no trailing slash', () => {
      withMockEnv({ NEXT_PUBLIC_BASE_URL: 'https://example.com' }, () => {
        expect(getSiteUrl()).toBe('https://example.com')
      })
    })

    it('returns empty string when env is not set', () => {
      withMockEnv({}, () => {
        delete process.env.NEXT_PUBLIC_BASE_URL
        expect(getSiteUrl()).toBe('')
      })
    })
  })

  describe('absoluteUrl', () => {
    it('joins slash-prefixed path with base URL', () => {
      withMockEnv({ NEXT_PUBLIC_BASE_URL: 'https://example.com' }, () => {
        expect(absoluteUrl('/articles/1')).toBe('https://example.com/articles/1')
      })
    })

    it('adds leading slash to path without one', () => {
      withMockEnv({ NEXT_PUBLIC_BASE_URL: 'https://example.com' }, () => {
        expect(absoluteUrl('articles/1')).toBe('https://example.com/articles/1')
      })
    })

    it('returns absolute http path as-is', () => {
      withMockEnv({ NEXT_PUBLIC_BASE_URL: 'https://example.com' }, () => {
        expect(absoluteUrl('https://other.com/x')).toBe('https://other.com/x')
      })
    })

    it('returns path as-is when no base URL is configured', () => {
      withMockEnv({}, () => {
        delete process.env.NEXT_PUBLIC_BASE_URL
        expect(absoluteUrl('/articles/1')).toBe('/articles/1')
      })
    })
  })

  describe('sendNotificationWebhook', () => {
    const originalFetch = global.fetch

    afterEach(() => {
      global.fetch = originalFetch
    })

    const mockFetch = (impl?: typeof fetch) => {
      global.fetch = jest.fn(impl ?? (async () => ({} as Response))) as typeof fetch
    }

    const fetchMock = () => global.fetch as jest.Mock

    it('returns early when no webhook URL is configured', async () => {
      mockFetch()
      await withMockEnvAsync({}, async () => {
        delete process.env.DISCORD_WEBHOOK_URL
        delete process.env.SLACK_WEBHOOK_URL
        await sendNotificationWebhook('금리 인상', 'https://example.com/a', 'test')
      })
      expect(fetchMock()).not.toHaveBeenCalled()
    })

    it('returns early when title does not match keywords', async () => {
      mockFetch()
      await withMockEnvAsync({ DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/123' }, async () => {
        await sendNotificationWebhook('일반 뉴스입니다', 'https://example.com/a', 'test')
      })
      expect(fetchMock()).not.toHaveBeenCalled()
    })

    it('sends Discord payload for discord.com webhooks', async () => {
      mockFetch()
      await withMockEnvAsync({ DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/123' }, async () => {
        await sendNotificationWebhook('금리 인상 발표', 'https://example.com/a', '위마켓')
      })

      expect(fetchMock()).toHaveBeenCalledTimes(1)
      const [calledUrl, init] = fetchMock().mock.calls[0]
      expect(calledUrl).toBe('https://discord.com/api/webhooks/123')
      expect(init?.method).toBe('POST')
      expect(init?.headers).toEqual({ 'Content-Type': 'application/json' })

      if (typeof init?.body === 'string') {
        const body = JSON.parse(init.body)
        expect(body.content).toContain('금리 인상 발표')
        expect(body.embeds[0].title).toBe('금리 인상 발표')
        expect(body.embeds[0].url).toBe('https://example.com/a')
        expect(body.embeds[0].footer.text).toContain('위마켓')
      } else {
        throw new Error('Expected string body for Discord payload')
      }
    })

    it('sends Slack payload for non-discord webhooks', async () => {
      mockFetch()
      await withMockEnvAsync({ SLACK_WEBHOOK_URL: 'https://hooks.slack.com/services/xxx' }, async () => {
        await sendNotificationWebhook('openai 발표', 'https://example.com/a', '위마켓')
      })

      expect(fetchMock()).toHaveBeenCalledTimes(1)
      const [calledUrl, init] = fetchMock().mock.calls[0]
      expect(calledUrl).toBe('https://hooks.slack.com/services/xxx')
      expect(init?.method).toBe('POST')

      if (typeof init?.body === 'string') {
        const body = JSON.parse(init.body)
        expect(body.text).toContain('openai 발표')
        expect(body.text).toContain('위마켓')
      } else {
        throw new Error('Expected string body for Slack payload')
      }
    })

    it('uses fallback description when description is omitted', async () => {
      mockFetch()
      await withMockEnvAsync({ DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/123' }, async () => {
        await sendNotificationWebhook('비트코인 급등', 'https://example.com/a', '위마켓')
      })

      const init = fetchMock().mock.calls[0]?.[1]
      if (typeof init?.body === 'string') {
        const body = JSON.parse(init.body)
        expect(body.embeds[0].description).toContain('본문 요약')
      } else {
        throw new Error('Expected string body')
      }
    })

    it('swallows fetch errors', async () => {
      mockFetch(() => Promise.reject(new Error('network down')))
      await withMockEnvAsync({ DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/123' }, async () => {
        await expect(
          sendNotificationWebhook('금리 인상', 'https://example.com/a', '위마켓')
        ).resolves.toBeUndefined()
      })
      expect(fetchMock()).toHaveBeenCalledTimes(1)
    })
  })

  describe('estimateReadingTime', () => {
    it('returns 1 for null, undefined, and empty text', () => {
      expect(estimateReadingTime(null)).toBe(1)
      expect(estimateReadingTime(undefined)).toBe(1)
      expect(estimateReadingTime('')).toBe(1)
    })

    it('calculates Korean reading time at 400 chars/min', () => {
      expect(estimateReadingTime('가'.repeat(400))).toBe(1)
      expect(estimateReadingTime('가'.repeat(401))).toBe(2)
      expect(estimateReadingTime('가'.repeat(800))).toBe(2)
    })

    it('calculates English reading time at 200 chars/min', () => {
      expect(estimateReadingTime('a'.repeat(200), 'en')).toBe(1)
      expect(estimateReadingTime('a'.repeat(201), 'en')).toBe(2)
    })

    it('defaults to Korean when language is omitted', () => {
      expect(estimateReadingTime('가'.repeat(800))).toBe(2)
    })

    it('applies English rate when language is en', () => {
      expect(estimateReadingTime('a'.repeat(200), 'en')).toBe(1)
      expect(estimateReadingTime('a'.repeat(201), 'en')).toBe(2)
    })
  })
})
