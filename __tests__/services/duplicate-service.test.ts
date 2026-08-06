jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    article: {
      findMany: jest.fn(),
    },
  },
}))

import prisma from '@/lib/db'
import { getDuplicateStats, mergeDuplicates } from '@/lib/services/duplicate/duplicate-service'

const mockPrisma = prisma as unknown as {
  article: {
    findMany: jest.Mock
  }
}

describe('mergeDuplicates', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('does not merge same-title articles published more than seven days apart', async () => {
    mockPrisma.article.findMany.mockResolvedValue([
      {
        id: 'older',
        title: 'Market Outlook',
        publishedAt: new Date('2026-01-01T00:00:00Z'),
        url: 'https://example.com/older',
      },
      {
        id: 'newer',
        title: 'Market Outlook',
        publishedAt: new Date('2026-01-15T00:00:00Z'),
        url: 'https://example.com/newer',
      },
    ])

    const result = await mergeDuplicates(true)

    expect(result.totalGroups).toBe(0)
    expect(result.totalDuplicates).toBe(0)
  })

  it('merges same-title articles published within seven days', async () => {
    mockPrisma.article.findMany.mockResolvedValue([
      {
        id: 'older',
        title: 'Market Outlook!',
        publishedAt: new Date('2026-01-01T00:00:00Z'),
        url: 'https://example.com/older',
      },
      {
        id: 'newer',
        title: 'market outlook',
        publishedAt: new Date('2026-01-07T00:00:00Z'),
        url: 'https://example.com/newer',
      },
    ])

    const result = await mergeDuplicates(true)

    expect(result.totalGroups).toBe(1)
    expect(result.totalDuplicates).toBe(1)
    expect(result.groups[0]?.removedIds).toEqual(['newer'])
  })

  it('reports only time-bounded duplicate candidates', async () => {
    mockPrisma.article.findMany.mockResolvedValue([
      {
        id: 'old',
        title: 'Market Outlook',
        publishedAt: new Date('2026-01-01T00:00:00Z'),
      },
      {
        id: 'nearby',
        title: 'Market Outlook',
        publishedAt: new Date('2026-01-02T00:00:00Z'),
      },
      {
        id: 'distant',
        title: 'Market Outlook',
        publishedAt: new Date('2026-02-01T00:00:00Z'),
      },
    ])

    const result = await getDuplicateStats()

    expect(result).toEqual({ potentialDuplicates: 1, groupsCount: 1 })
  })
})
