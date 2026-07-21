import { upsertArticles, getArticles, getArticleById } from '@/lib/rss/db-service'
import { ParsedArticle } from '@/lib/rss/fetcher'

// Mock the utils (sendNotificationWebhook lives in @/lib/utils)
jest.mock('@/lib/utils', () => ({
  sendNotificationWebhook: jest.fn().mockResolvedValue(undefined),
}))

// Mock the prisma client
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    article: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}))

import prisma from '@/lib/db'
import { sendNotificationWebhook } from '@/lib/utils'

const mockPrisma = prisma as unknown as {
  article: {
    findUnique: jest.Mock
    create: jest.Mock
    findMany: jest.Mock
    count: jest.Mock
  }
}

const mockSendNotification = sendNotificationWebhook as jest.MockedFunction<typeof sendNotificationWebhook>

describe('Article Upsert', () => {
  const sampleArticle: ParsedArticle = {
    guid: 'guid-1',
    title: 'Test Article',
    url: 'https://example.com/article/1',
    description: 'Test description for article',
    author: 'Test Author',
    thumbnail: 'https://example.com/thumb.jpg',
    publishedAt: new Date('2024-01-15T10:00:00Z'),
    category: 'economy',
    language: 'ko',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('upsertArticles', () => {
    it('should insert new articles', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null)
      mockPrisma.article.create.mockResolvedValue({
        id: 'new-id',
        title: 'Test Article',
        url: 'https://example.com/article/1',
        source: { name: '한국경제' },
      })

      const result = await upsertArticles('source-hankyung', [sampleArticle])

      expect(result.newCount).toBe(1)
      expect(result.totalCount).toBe(1)
      expect(mockPrisma.article.create).toHaveBeenCalledWith({
        data: {
          sourceId: 'source-hankyung',
          guid: 'guid-1',
          title: 'Test Article',
          url: 'https://example.com/article/1',
          description: 'Test description for article',
          author: 'Test Author',
          thumbnail: 'https://example.com/thumb.jpg',
          publishedAt: new Date('2024-01-15T10:00:00Z'),
          category: 'economy',
          language: 'ko',
        },
        include: { source: true },
      })
    })

    it('should skip duplicate articles (by url)', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: 'existing-id' })

      const result = await upsertArticles('source-hankyung', [sampleArticle])

      expect(result.newCount).toBe(0)
      expect(result.totalCount).toBe(1)
      expect(mockPrisma.article.create).not.toHaveBeenCalled()
    })

    it('should handle multiple articles with mixed duplicates', async () => {
      const article2: ParsedArticle = {
        ...sampleArticle,
        guid: 'guid-2',
        url: 'https://example.com/article/2',
        title: 'Second Article',
      }

      mockPrisma.article.findUnique
        .mockResolvedValueOnce({ id: 'existing-id' }) // First article exists
        .mockResolvedValueOnce(null) // Second article is new
      mockPrisma.article.create.mockResolvedValue({
        id: 'new-id-2',
        title: 'Second Article',
        source: { name: '한국경제' },
      })

      const result = await upsertArticles('source-hankyung', [sampleArticle, article2])

      expect(result.newCount).toBe(1)
      expect(result.totalCount).toBe(2)
    })

    it('should send notification webhook for new articles with correct args', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null)
      mockPrisma.article.create.mockResolvedValue({
        id: 'new-id',
        title: 'Test Article',
        url: 'https://example.com/article/1',
        source: { name: '한국경제' },
        description: 'Test description for article',
      })

      await upsertArticles('source-hankyung', [sampleArticle])

      expect(mockSendNotification).toHaveBeenCalledWith(
        'Test Article',
        'https://example.com/article/1',
        '한국경제',
        'Test description for article',
      )
    })

    it('should not send notification for duplicate articles', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: 'existing-id' })

      await upsertArticles('source-hankyung', [sampleArticle])

      expect(mockSendNotification).not.toHaveBeenCalled()
    })

    it('should handle empty articles array', async () => {
      const result = await upsertArticles('source-hankyung', [])

      expect(result.newCount).toBe(0)
      expect(result.totalCount).toBe(0)
    })

    it('should handle database errors gracefully (skip bad article)', async () => {
      mockPrisma.article.findUnique.mockRejectedValue(new Error('DB error'))

      const result = await upsertArticles('source-hankyung', [sampleArticle])

      // Error is caught per-article, totalCount still counts all articles
      expect(result.newCount).toBe(0)
      expect(result.totalCount).toBe(1)
    })
  })

  describe('getArticles', () => {
    it('should return articles with pagination', async () => {
      const mockArticles = [
        { id: '1', title: 'Article 1', source: { nameEn: 'hankyung' } },
      ]
      mockPrisma.article.findMany.mockResolvedValue(mockArticles)
      mockPrisma.article.count.mockResolvedValue(10)

      const result = await getArticles({
        page: 1,
        limit: 10,
      })

      expect(result.articles).toEqual(mockArticles)
      expect(result.total).toBe(10)
      expect(result.page).toBe(1)
      expect(result.totalPages).toBe(1)
    })

    it('should filter by category via source relation', async () => {
      mockPrisma.article.findMany.mockResolvedValue([])
      mockPrisma.article.count.mockResolvedValue(0)

      await getArticles({
        category: 'domestic',
      })

      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            source: expect.objectContaining({
              category: 'domestic',
            }),
          }),
        })
      )
    })

    it('should filter by language', async () => {
      mockPrisma.article.findMany.mockResolvedValue([])
      mockPrisma.article.count.mockResolvedValue(0)

      await getArticles({
        language: 'en',
      })

      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            language: 'en',
          }),
        })
      )
    })

    it('should search by title and description (lowercase)', async () => {
      mockPrisma.article.findMany.mockResolvedValue([])
      mockPrisma.article.count.mockResolvedValue(0)

      await getArticles({
        search: 'Test Query',
      })

      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { title: { contains: 'test query' } },
              { description: { contains: 'test query' } },
            ]),
          }),
        })
      )
    })

    it('should exclude source ids', async () => {
      mockPrisma.article.findMany.mockResolvedValue([])
      mockPrisma.article.count.mockResolvedValue(0)

      await getArticles({
        excludeSourceIds: ['id-1', 'id-2'],
      })

      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sourceId: { notIn: ['id-1', 'id-2'] },
          }),
        })
      )
    })

    it('should filter by isBookmarked', async () => {
      mockPrisma.article.findMany.mockResolvedValue([])
      mockPrisma.article.count.mockResolvedValue(0)

      await getArticles({
        isBookmarked: true,
      })

      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isBookmarked: true,
          }),
        })
      )
    })
  })

  describe('getArticleById', () => {
    it('should return article by id', async () => {
      const mockArticle = { id: 'article-id-1', title: 'Test', source: { name: 'HK' } }
      mockPrisma.article.findUnique.mockResolvedValue(mockArticle)

      const result = await getArticleById('article-id-1')

      expect(result).toEqual(mockArticle)
      expect(mockPrisma.article.findUnique).toHaveBeenCalledWith({
        where: { id: 'article-id-1' },
        include: { source: true },
      })
    })

    it('should return null for non-existent article', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null)

      const result = await getArticleById('non-existent-id')

      expect(result).toBeNull()
    })
  })
})
