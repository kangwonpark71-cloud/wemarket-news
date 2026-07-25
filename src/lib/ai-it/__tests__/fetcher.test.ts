// We test the utility functions directly; fetchAIITFeed is tested via module mocking
import { fetchAIITFeed, fetchAllAIITFeeds } from '../fetcher'
import type { AIITSourceConfig } from '../sources'

// Shared mock instance for rss-parser — the fetcher creates a SINGLE parser
// at module level, so every test must use the same parseURL mock.
// eslint-disable-next-line no-var
var mockRssInstance: { parseURL: jest.Mock }

jest.mock('rss-parser', () => {
  mockRssInstance = { parseURL: jest.fn() }
  return jest.fn().mockImplementation(() => mockRssInstance)
})

// Mock playwright-crawler
jest.mock('../playwright-crawler', () => ({
  crawlWithPlaywright: jest.fn(),
}))

const mockCrawler = jest.requireMock('../playwright-crawler')

function createMockSource(overrides: Partial<AIITSourceConfig> = {}): AIITSourceConfig {
  return {
    name: 'Test Source',
    nameEn: 'test_source',
    url: 'https://example.com/rss',
    category: 'ai',
    subcategory: 'test_sub',
    language: 'en',
    icon: '🤖',
    fetchInterval: 1,
    type: 'rss',
    ...overrides,
  }
}

describe('ai-it fetcher', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('fetchAIITFeed — RSS type', () => {
    it('parses RSS items into articles', async () => {
      mockRssInstance.parseURL.mockResolvedValueOnce({
        items: [
          {
            title: 'Test Article',
            link: 'https://example.com/article1',
            pubDate: 'Mon, 15 Jan 2024 10:30:00 GMT',
            contentSnippet: 'This is a test description',
            guid: 'guid-1',
            creator: 'Author Name',
          },
        ],
      })

      const source = createMockSource()
      const result = await fetchAIITFeed(source)

      expect(result.error).toBeUndefined()
      expect(result.articles).toHaveLength(1)
      expect(result.articles[0].title).toBe('Test Article')
      expect(result.articles[0].url).toBe('https://example.com/article1')
      expect(result.articles[0].author).toBe('Author Name')
      expect(result.articles[0].sourceNameEn).toBe('test_source')
    })

    it('filters out items with empty title or link', async () => {
      mockRssInstance.parseURL.mockResolvedValueOnce({
        items: [
          { title: 'Valid', link: 'https://example.com/1' },
          { title: '', link: 'https://example.com/2' },
          { title: 'No Link', link: '' },
          { title: '', link: '' },
        ],
      })

      const result = await fetchAIITFeed(createMockSource())
      expect(result.articles).toHaveLength(1)
      expect(result.articles[0].title).toBe('Valid')
    })

    it('falls back to current date when pubDate is missing', async () => {
      mockRssInstance.parseURL.mockResolvedValueOnce({
        items: [
          { title: 'No Date', link: 'https://example.com/1' },
        ],
      })

      const result = await fetchAIITFeed(createMockSource())
      const now = new Date()
      expect(result.articles[0].publishedAt.getTime()).toBeCloseTo(now.getTime(), -2) // within ~100ms
    })

    it('returns error when all retries exhausted', async () => {
      mockRssInstance.parseURL.mockImplementation(
        () => Promise.reject(new Error('Connection timeout')),
      )

      const result = await fetchAIITFeed(createMockSource())
      expect(result.articles).toHaveLength(0)
      expect(result.error).toContain('Failed after retries')
    }, 30000)

    it('handles fetch error gracefully', async () => {
      mockRssInstance.parseURL.mockImplementation(
        () => Promise.reject(new Error('Network error')),
      )

      const result = await fetchAIITFeed(createMockSource())
      expect(result.articles).toHaveLength(0)
      expect(result.error).toBeDefined()
    }, 30000)
  })

  describe('fetchAIITFeed — Crawler type', () => {
    it('dispatches to playwright crawler when type is crawler', async () => {
      mockCrawler.crawlWithPlaywright.mockResolvedValueOnce({
        articles: [
          {
            title: 'Crawled Article',
            url: 'https://example.com/crawled',
            description: 'Crawled description',
            publishedAt: new Date('2024-01-15'),
            category: 'ai_tools',
          },
        ],
        error: undefined,
        fetchedAt: new Date(),
      })

      const source = createMockSource({
        type: 'crawler',
        url: 'https://example.com/crawler-target',
        crawlerConfig: {
          selector: '.card',
          titleSelector: 'h3',
          linkSelector: 'a',
        },
      })

      const result = await fetchAIITFeed(source)
      expect(mockCrawler.crawlWithPlaywright).toHaveBeenCalledWith(source)
      expect(result.articles).toHaveLength(1)
      expect(result.articles[0].title).toBe('Crawled Article')
    })

    it('handles crawler errors', async () => {
      mockCrawler.crawlWithPlaywright.mockResolvedValueOnce({
        articles: [],
        error: 'Crawler failed: page not found',
        fetchedAt: new Date(),
      })

      const source = createMockSource({
        type: 'crawler',
        url: 'https://example.com/bad-page',
        crawlerConfig: {
          selector: '.card',
          titleSelector: 'h3',
          linkSelector: 'a',
        },
      })

      const result = await fetchAIITFeed(source)
      expect(result.articles).toHaveLength(0)
      expect(result.error).toContain('Crawler failed')
    })
  })

  describe('fetchAllAIITFeeds — multi-source', () => {
    it('fetches from multiple sources concurrently', async () => {
      mockRssInstance.parseURL.mockResolvedValue({
        items: [{ title: 'Article', link: 'https://example.com/1' }],
      })

      const sources = [
        createMockSource({ nameEn: 'source_a', url: 'https://a.com/rss' }),
        createMockSource({ nameEn: 'source_b', url: 'https://b.com/rss' }),
      ]

      const results = await fetchAllAIITFeeds(sources)
      expect(results.size).toBe(2)
      expect(results.get('source_a')?.articles).toHaveLength(1)
      expect(results.get('source_b')?.articles).toHaveLength(1)
    })

    it('handles partial failures gracefully', async () => {
      let callCount = 0
      mockRssInstance.parseURL.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({ items: [{ title: 'Good', link: 'https://example.com/1' }] })
        }
        return Promise.reject(new Error('Failed'))
      })

      const sources = [
        createMockSource({ nameEn: 'good_source', url: 'https://good.com/rss' }),
        createMockSource({ nameEn: 'bad_source', url: 'https://bad.com/rss' }),
      ]

      const results = await fetchAllAIITFeeds(sources)
      expect(results.size).toBe(2)
      expect(results.get('good_source')?.articles).toHaveLength(1)
      expect(results.get('bad_source')?.error).toBeDefined()
    }, 30000)
  })
})