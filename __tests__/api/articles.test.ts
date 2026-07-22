/**
 * @jest-environment node
 */

// Mock the entire db-service module before importing the route
jest.mock('@/lib/rss/db-service', () => ({
  getArticles: jest.fn(),
  getArticleStats: jest.fn(),
}))

jest.mock('@/lib/services/cache/cache-service', () => ({
  cacheService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  },
  CacheKeys: {
    articles: (params: Record<string, string | undefined>) => {
      const sorted = Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('&');
      return `articles:list:${sorted}`;
    },
  },
  CacheTTL: { MINUTE_5: 300 },
}))

jest.mock('@/lib/db', () => ({
  prisma: {
    userPreference: { findUnique: jest.fn() },
  },
}))

jest.mock('@/lib/utils/auth', () => ({
  verifySessionToken: jest.fn(),
}))

import { GET } from '@/app/api/articles/route'
import { getArticles, getArticleStats } from '@/lib/rss/db-service'
import { prisma } from '@/lib/db'
import { verifySessionToken } from '@/lib/utils/auth'

const mockGetArticles = jest.mocked(getArticles)
const mockGetArticleStats = jest.mocked(getArticleStats)
const mockVerifySessionToken = jest.mocked(verifySessionToken)

function makeRequest(path = '/api/articles', opts?: { cookie?: string; method?: string }) {
  const url = `http://localhost:3000${path}`
  const headers = new Headers()
  if (opts?.cookie) headers.set('cookie', opts.cookie)
  return new Request(url, { method: opts?.method || 'GET', headers })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetArticles.mockResolvedValue({
    articles: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  } as never)
  mockGetArticleStats.mockResolvedValue({ totalArticles: 0, totalSources: 0, recentFetches: [] } as never)
})

describe('/api/articles', () => {
  it('returns 200 with articles list', async () => {
    mockGetArticles.mockResolvedValue({
      articles: [
        { id: '1', title: 'Test Article', url: 'https://example.com/1', source: { nameEn: 'test' } },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    } as never)

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.articles).toHaveLength(1)
    expect(body.data.articles[0].title).toBe('Test Article')
  })

  it('passes query parameters to getArticles', async () => {
    await GET(makeRequest('/api/articles?category=domestic&source=hankyung&page=2&limit=10&search=금리&sortBy=createdAt'))

    expect(mockGetArticles).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'domestic',
        sourceName: 'hankyung',
        page: 2,
        limit: 10,
        search: '금리',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
    )
  })

  it('caps limit at 100', async () => {
    await GET(makeRequest('/api/articles?limit=999'))
    expect(mockGetArticles).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 100 })
    )
  })

  it('includes stats when stats=true', async () => {
    mockGetArticleStats.mockResolvedValue({
      totalArticles: 42,
      totalSources: 5,
      recentFetches: [],
    } as never)

    const response = await GET(makeRequest('/api/articles?stats=true'))
    const body = await response.json()

    expect(body.stats).toEqual({
      totalArticles: 42,
      totalSources: 5,
      recentFetches: [],
    })
  })

  it('returns empty stats when stats is not requested', async () => {
    const response = await GET(makeRequest('/api/articles'))
    const body = await response.json()

    expect(body.stats).toBeNull()
  })

  it('hides hidden sources for authenticated users', async () => {
    mockVerifySessionToken.mockReturnValue('user-123')
    ;(prisma.userPreference.findUnique as jest.Mock).mockResolvedValue({
      hiddenSources: 'source-a,source-b',
    })

    await GET(makeRequest('/api/articles', { cookie: 'session=valid-token' }))

    expect(mockGetArticles).toHaveBeenCalledWith(
      expect.objectContaining({
        excludeSourceIds: ['source-a', 'source-b'],
      })
    )
  })

  it('returns 500 on db failure', async () => {
    mockGetArticles.mockRejectedValue(new Error('DB connection lost'))

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Failed to fetch articles')
  })
})
