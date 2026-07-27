/**
 * AI/IT Fetcher Tests
 *
 * Tests for fetchAIITFeed and fetchAllAIITFeeds in src/lib/ai-it/fetcher.ts:
 * - RSS source parsing
 * - Crawler source dispatch  
 * - Error handling (retries exhausted, network error)
 * - Empty input handling
 */

// Mock external dependencies
jest.mock('rss-parser', () => {
  const mockParseURL = jest.fn()
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      parseURL: mockParseURL,
      timeout: 15000,
      headers: {},
      customFields: {},
    })),
    mockParseURL,
  }
})

jest.mock('@/lib/ai-it/playwright-crawler', () => ({
  crawlWithPlaywright: jest.fn(),
}))

jest.mock('@/lib/utils/rss-helper', () => ({
  extractThumbnail: jest.fn().mockReturnValue('https://example.com/thumb.jpg'),
  extractCategory: jest.fn().mockReturnValue('ai'),
  fetchWithRetry: jest.fn(),
}))

import { crawlWithPlaywright } from '@/lib/ai-it/playwright-crawler'
import { fetchWithRetry } from '@/lib/utils/rss-helper'
import { fetchAIITFeed, fetchAllAIITFeeds } from '@/lib/ai-it/fetcher'
import type { AIITSourceConfig } from '@/lib/ai-it/sources'

const mockRSSSource: AIITSourceConfig = {
  name: 'OpenAI Blog',
  nameEn: 'openai_blog',
  url: 'https://openai.com/blog/rss.xml',
  category: 'ai',
  subcategory: 'openai',
  language: 'en',
  icon: '🤖',
  fetchInterval: 1,
  type: 'rss',
}

const mockCrawlerSource: AIITSourceConfig = {
  name: 'AI Agents Directory',
  nameEn: 'ai_agents_dir',
  url: 'https://aiagentsdirectory.com/',
  category: 'ai',
  subcategory: 'ai_agents',
  language: 'en',
  icon: '🤖',
  fetchInterval: 1,
  type: 'crawler',
  crawlerConfig: {
    selector: '.agent-card',
    titleSelector: 'h3',
    linkSelector: 'a',
    descriptionSelector: '.description',
    pagination: { type: 'page', maxPages: 3 },
  },
}

const mockFeedItems = [
  {
    title: '  GPT-5 Released  ',
    link: '  https://openai.com/blog/gpt5  ',
    pubDate: '2024-01-15T10:00:00Z',
    isoDate: '2024-01-15T10:00:00Z',
    guid: 'gpt5-001',
    contentSnippet: 'OpenAI has released GPT-5 with breakthrough capabilities.',
    content: '<p>Full article content about GPT-5</p>',
    creator: 'Sam Altman',
  },
  {
    title: '  DALL-E 4 Announced  ',
    link: '  https://openai.com/blog/dalle4  ',
    pubDate: '2024-01-14T08:00:00Z',
    guid: 'dalle4-001',
    contentSnippet: 'DALL-E 4 brings video generation capabilities.',
    creator: 'OpenAI Team',
  },
  {
    title: '  Invalid item (no title)  ',
    link: '',
    pubDate: '2024-01-13T12:00:00Z',
  } as unknown as typeof mockFeedItems[0],
]

describe('AI/IT Fetcher', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('fetchAIITFeed - RSS source', () => {
    it('parses RSS feed items into AIITParsedArticle array', async () => {
      const mockFetchResult = {
        feed: {
          items: mockFeedItems.slice(0, 2),
        },
      }
      ;(fetchWithRetry as jest.Mock).mockResolvedValue(mockFetchResult)

      const result = await fetchAIITFeed(mockRSSSource)

      expect(result.articles).toHaveLength(2)
      expect(result.error).toBeUndefined()
      expect(result.sourceNameEn).toBe('openai_blog')

      // First article
      expect(result.articles[0].title).toBe('GPT-5 Released')
      expect(result.articles[0].url).toBe('https://openai.com/blog/gpt5')
      expect(result.articles[0].guid).toBe('gpt5-001')
      expect(result.articles[0].author).toBe('Sam Altman')
      expect(result.articles[0].language).toBe('en')
      expect(result.articles[0].sourceNameEn).toBe('openai_blog')

      // Second article
      expect(result.articles[1].title).toBe('DALL-E 4 Announced')
      expect(result.articles[1].author).toBe('OpenAI Team')
    })

    it('filters out items with empty title or link', async () => {
      const mockFetchResult = {
        feed: {
          items: mockFeedItems,
        },
      }
      ;(fetchWithRetry as jest.Mock).mockResolvedValue(mockFetchResult)

      const result = await fetchAIITFeed(mockRSSSource)

      // The third item has empty link, should be filtered out
      expect(result.articles).toHaveLength(2)
    })

    it('handles missing pubDate by using isoDate', async () => {
      const items = [{
        title: 'No PubDate',
        link: 'https://example.com/article',
        isoDate: '2024-06-01T00:00:00Z',
      }]
      ;(fetchWithRetry as jest.Mock).mockResolvedValue({ feed: { items } })

      const result = await fetchAIITFeed(mockRSSSource)
      expect(result.articles).toHaveLength(1)
      expect(result.articles[0].publishedAt.toISOString()).toContain('2024-06-01')
    })

    it('handles retry exhaustion gracefully', async () => {
      ;(fetchWithRetry as jest.Mock).mockResolvedValue(null)

      const result = await fetchAIITFeed(mockRSSSource)

      expect(result.articles).toHaveLength(0)
      expect(result.error).toContain('Failed after retries')
    })

    it('handles fetch errors gracefully', async () => {
      ;(fetchWithRetry as jest.Mock).mockRejectedValue(new Error('Connection refused'))

      const result = await fetchAIITFeed(mockRSSSource)

      expect(result.articles).toHaveLength(0)
      expect(result.error).toBe('Connection refused')
    })
  })

  describe('fetchAIITFeed - Crawler source', () => {
    it('delegates to crawlWithPlaywright for crawler-type sources', async () => {
      const mockCrawlResult = {
        articles: [
          {
            guid: 'agent-001',
            title: 'New AI Agent Platform',
            url: 'https://aiagentsdirectory.com/agent1',
            description: 'A new platform for AI agents.',
            thumbnail: 'https://example.com/thumb.jpg',
            publishedAt: new Date('2024-02-01'),
            category: 'ai_agents',
          },
        ],
        fetchedAt: new Date(),
        sourceNameEn: 'ai_agents_dir',
      }
      ;(crawlWithPlaywright as jest.Mock).mockResolvedValue(mockCrawlResult)

      const result = await fetchAIITFeed(mockCrawlerSource)

      expect(crawlWithPlaywright).toHaveBeenCalledWith(mockCrawlerSource)
      expect(result.articles).toHaveLength(1)
      expect(result.articles[0].title).toBe('New AI Agent Platform')
      expect(result.articles[0].sourceNameEn).toBe('ai_agents_dir')
    })
  })

  describe('fetchAllAIITFeeds', () => {
    it('fetches all sources and returns a map keyed by nameEn', async () => {
      ;(fetchWithRetry as jest.Mock).mockResolvedValue({
        feed: { items: [{ title: 'Article 1', link: 'https://example.com/1', pubDate: '2024-01-01T00:00:00Z' }] },
      })

      const sources = [
        { ...mockRSSSource, nameEn: 'source_a' },
        { ...mockRSSSource, nameEn: 'source_b' },
      ]

      const results = await fetchAllAIITFeeds(sources)

      expect(results.size).toBe(2)
      expect(results.get('source_a')).toBeDefined()
      expect(results.get('source_b')).toBeDefined()
      expect(results.get('source_a')!.articles).toHaveLength(1)
      expect(results.get('source_b')!.articles).toHaveLength(1)
    })

    it('handles partial failures without throwing', async () => {
      ;(fetchWithRetry as jest.Mock)
        .mockResolvedValueOnce({
          feed: { items: [{ title: 'Good Article', link: 'https://example.com/good', pubDate: '2024-01-01T00:00:00Z' }] },
        })
        .mockRejectedValueOnce(new Error('Network error'))

      const sources = [
        { ...mockRSSSource, nameEn: 'good_source' },
        { ...mockRSSSource, nameEn: 'bad_source' },
      ]

      const results = await fetchAllAIITFeeds(sources)

      expect(results.size).toBe(2)
      expect(results.get('good_source')!.articles).toHaveLength(1)
      expect(results.get('bad_source')!.articles).toHaveLength(0)
      expect(results.get('bad_source')!.error).toBe('Network error')
    })

    it('returns empty map for empty source array', async () => {
      const results = await fetchAllAIITFeeds([])
      expect(results.size).toBe(0)
    })
  })
})