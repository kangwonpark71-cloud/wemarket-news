import { fetchFeed, fetchAllFeeds } from '@/lib/rss/fetcher'
import { RSSSourceConfig } from '@/lib/rss/sources'

// Mock the rss-parser module
jest.mock('rss-parser', () => {
  return jest.fn().mockImplementation(() => ({
    parseURL: jest.fn(),
  }))
})

// Mock the retry helper
jest.mock('@/lib/utils/rss-helper', () => ({
  extractThumbnail: jest.fn(),
  extractCategory: jest.fn(),
  fetchWithRetry: jest.fn(),
}))

import { fetchWithRetry } from '@/lib/utils/rss-helper'

const mockFetchWithRetry = fetchWithRetry as jest.MockedFunction<typeof fetchWithRetry>

describe('RSS Fetcher', () => {
  const mockSource: RSSSourceConfig = {
    name: '한국경제',
    nameEn: 'hankyung',
    url: 'https://example.com/rss',
    category: 'domestic',
    language: 'ko',
    subcategory: 'economy',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('fetchFeed', () => {
    it('should parse RSS feed and return articles', async () => {
      const mockFeed = {
        feed: {
          items: [
            {
              title: 'Test Article',
              link: 'https://example.com/article/1',
              contentSnippet: 'Test description',
              pubDate: '2024-01-15T10:00:00Z',
              guid: 'guid-1',
              creator: 'Test Author',
            },
          ],
        },
      }

      mockFetchWithRetry.mockResolvedValue(mockFeed)

      const result = await fetchFeed(mockSource)

      expect(result.articles).toHaveLength(1)
      expect(result.articles[0]).toEqual({
        guid: 'guid-1',
        title: 'Test Article',
        url: 'https://example.com/article/1',
        description: 'Test description',
        author: 'Test Author',
        thumbnail: undefined,
        publishedAt: expect.any(Date),
        category: 'economy',
        language: 'ko',
      })
      expect(result.sourceName).toBe('hankyung')
      expect(result.error).toBeUndefined()
    })

    it('should skip articles without title or link', async () => {
      const mockFeed = {
        feed: {
          items: [
            { title: 'Valid', link: 'https://example.com/1' },
            { title: '', link: 'https://example.com/2' },
            { title: 'No Link', link: '' },
            { link: 'https://example.com/4' },
          ],
        },
      }

      mockFetchWithRetry.mockResolvedValue(mockFeed)

      const result = await fetchFeed(mockSource)

      expect(result.articles).toHaveLength(1)
      expect(result.articles[0].title).toBe('Valid')
    })

    it('should handle missing pubDate by using current date', async () => {
      const mockFeed = {
        feed: {
          items: [
            {
              title: 'No Date Article',
              link: 'https://example.com/1',
            },
          ],
        },
      }

      mockFetchWithRetry.mockResolvedValue(mockFeed)

      const result = await fetchFeed(mockSource)

      expect(result.articles[0].publishedAt).toBeInstanceOf(Date)
    })

    it('should handle invalid pubDate gracefully', async () => {
      const mockFeed = {
        feed: {
          items: [
            {
              title: 'Invalid Date',
              link: 'https://example.com/1',
              pubDate: 'not-a-date',
            },
          ],
        },
      }

      mockFetchWithRetry.mockResolvedValue(mockFeed)

      const result = await fetchFeed(mockSource)

      expect(result.articles[0].publishedAt).toBeInstanceOf(Date)
    })

    it('should return error when fetch fails after retries', async () => {
      mockFetchWithRetry.mockResolvedValue(null)

      const result = await fetchFeed(mockSource)

      expect(result.articles).toHaveLength(0)
      expect(result.error).toContain('Failed after retries')
      expect(result.sourceName).toBe('hankyung')
    })

    it('should handle parser exceptions gracefully', async () => {
      mockFetchWithRetry.mockRejectedValue(new Error('Network error'))

      const result = await fetchFeed(mockSource)

      expect(result.articles).toHaveLength(0)
      expect(result.error).toBe('Network error')
    })

    it('should use isoDate as fallback for pubDate', async () => {
      const mockFeed = {
        feed: {
          items: [
            {
              title: 'ISO Date Article',
              link: 'https://example.com/1',
              isoDate: '2024-01-15T12:00:00.000Z',
            },
          ],
        },
      }

      mockFetchWithRetry.mockResolvedValue(mockFeed)

      const result = await fetchFeed(mockSource)

      expect(result.articles[0].publishedAt).toEqual(new Date('2024-01-15T12:00:00.000Z'))
    })

    it('should truncate description to 500 characters', async () => {
      const longDescription = 'A'.repeat(600)
      const mockFeed = {
        feed: {
          items: [
            {
              title: 'Long Description',
              link: 'https://example.com/1',
              contentSnippet: longDescription,
            },
          ],
        },
      }

      mockFetchWithRetry.mockResolvedValue(mockFeed)

      const result = await fetchFeed(mockSource)

      expect(result.articles[0].description).toHaveLength(500)
    })
  })

  describe('fetchAllFeeds', () => {
    it('should fetch multiple sources in parallel', async () => {
      const sources: RSSSourceConfig[] = [
        { ...mockSource, nameEn: 'source1' },
        { ...mockSource, nameEn: 'source2' },
      ]

      mockFetchWithRetry
        .mockResolvedValueOnce({
          feed: { items: [{ title: 'Article 1', link: 'https://example.com/1' }] },
        })
        .mockResolvedValueOnce({
          feed: { items: [{ title: 'Article 2', link: 'https://example.com/2' }] },
        })

      const results = await fetchAllFeeds(sources)

      expect(results.size).toBe(2)
      expect(results.get('source1')?.articles).toHaveLength(1)
      expect(results.get('source2')?.articles).toHaveLength(1)
    })

    it('should handle partial failures gracefully', async () => {
      const sources: RSSSourceConfig[] = [
        { ...mockSource, nameEn: 'success' },
        { ...mockSource, nameEn: 'failure' },
      ]

      mockFetchWithRetry
        .mockResolvedValueOnce({
          feed: { items: [{ title: 'Success', link: 'https://example.com/1' }] },
        })
        .mockResolvedValueOnce(null)

      const results = await fetchAllFeeds(sources)

      expect(results.size).toBe(2)
      expect(results.get('success')?.articles).toHaveLength(1)
      expect(results.get('failure')?.articles).toHaveLength(0)
      expect(results.get('failure')?.error).toContain('Failed after retries')
    })
  })
})
