import { closeBrowser, ExtractionStrategy } from '../playwright-crawler'
import type { AIITSourceConfig } from '../sources'

// ── Mock playwright ────────────────────────────────────────────
const mockPage = {
  goto:              jest.fn().mockResolvedValue(undefined),
  waitForSelector:   jest.fn().mockResolvedValue(undefined),
  waitForLoadState:  jest.fn().mockResolvedValue(undefined),
  waitForTimeout:    jest.fn().mockResolvedValue(undefined),
  close:             jest.fn().mockResolvedValue(undefined),
  url:               jest.fn().mockReturnValue('https://example.com/news'),
  evaluate:          jest.fn(),
  locator:           jest.fn().mockReturnValue({ isVisible: jest.fn().mockResolvedValue(false), click: jest.fn().mockResolvedValue(undefined) }),
}

const mockContext = {
  newPage:         jest.fn().mockResolvedValue(mockPage),
  close:           jest.fn().mockResolvedValue(undefined),
  pages:           jest.fn().mockReturnValue([mockPage]),
  addInitScript:   jest.fn().mockResolvedValue(undefined),
}

const mockBrowser = {
  newContext: jest.fn().mockResolvedValue(mockContext),
  isConnected: jest.fn().mockReturnValue(true),
  close:      jest.fn().mockResolvedValue(undefined),
}

jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn().mockResolvedValue(mockBrowser),
  },
}))

// ── Sample minimal source config ───────────────────────────────
function makeSource(overrides: Partial<AIITSourceConfig> = {}): AIITSourceConfig {
  return {
    name:            'Test Source',
    nameEn:          'test_source',
    url:             'https://example.com/news',
    category:        'it',
    subcategory:     '',
    language:        'en',
    fetchInterval:   60,
    type:            'crawler',
    crawlerConfig:   {
      selector:            'article',
      titleSelector:       'h2 a',
      linkSelector:        'h2 a',
      descriptionSelector: 'p.desc',
      thumbnailSelector:   'img.thumb',
      dateSelector:        'time',
      pagination:          undefined,
    },
    ...overrides,
  }
}

// ── Module under test ──────────────────────────────────────────
const { crawlWithPlaywright, crawlAllWithPlaywright } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../playwright-crawler') as typeof import('../playwright-crawler')

describe('playwright-crawler', () => {
  afterAll(async () => {
    await closeBrowser()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── crawlWithPlaywright ──────────────────────────────────────

  it('should return error when no crawlerConfig is provided', async () => {
    const source = makeSource({ crawlerConfig: undefined as unknown as AIITSourceConfig['crawlerConfig'] })
    const result = await crawlWithPlaywright(source)
    expect(result.error).toBe('No crawler config provided')
    expect(result.articles).toHaveLength(0)
    expect(result.pagesCrawled).toBe(0)
  })

  it('should extract articles and return CrawlResult on success', async () => {
    mockPage.evaluate.mockResolvedValue([
      { title: 'Article 1', url: 'https://example.com/1', description: 'Desc 1', thumbnail: '' },
      { title: 'Article 2', url: '',                         description: '',         thumbnail: '' }, // filtered: empty url
      { title: '',          url: 'https://example.com/3',    description: '',         thumbnail: '' }, // filtered: empty title
    ])

    const result = await crawlWithPlaywright(makeSource())
    expect(result.error).toBeUndefined()
    expect(result.articles).toHaveLength(1)
    expect(result.articles[0].title).toBe('Article 1')
    expect(result.articles[0].url).toBe('https://example.com/1')
    expect(result.sourceNameEn).toBe('test_source')
    expect(result.pagesCrawled).toBeGreaterThanOrEqual(1)
  })

  it('should handle navigation error gracefully', async () => {
    mockPage.goto.mockRejectedValueOnce(new Error('Timeout: 30000ms exceeded'))

    const result = await crawlWithPlaywright(makeSource())
    expect(result.error).toContain('Timeout')
    expect(result.articles).toHaveLength(0)
    expect(result.pagesCrawled).toBe(0)
  })

  it('should handle waitForSelector failure gracefully', async () => {
    mockPage.goto.mockResolvedValue(undefined)
    mockPage.waitForSelector.mockRejectedValueOnce(new Error('Selector not found'))
    mockPage.evaluate.mockResolvedValue([])

    const result = await crawlWithPlaywright(makeSource())
    // waitForSelector error is caught and logged; extract continues with fallback
    expect(result.error).toBeUndefined()
    expect(result.articles).toHaveLength(0)
  })

  // ── crawlAllWithPlaywright ───────────────────────────────────

  it('should crawl multiple sources in parallel', async () => {
    mockPage.evaluate.mockResolvedValue([
      { title: 'Article', url: 'https://example.com/a', description: '', thumbnail: '' },
    ])
    mockPage.goto.mockResolvedValue(undefined)

    const sources = [
      makeSource({ nameEn: 'source_1', url: 'https://example1.com' }),
      makeSource({ nameEn: 'source_2', url: 'https://example2.com' }),
    ]

    const results = await crawlAllWithPlaywright(sources)
    expect(results.size).toBe(2)
    expect(results.get('source_1')?.articles).toHaveLength(1)
    expect(results.get('source_2')?.articles).toHaveLength(1)
  })

  it('should handle partial failures in crawlAllWithPlaywright', async () => {
    // First source succeeds, second fails
    mockPage.goto
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Network error'))

    mockPage.evaluate.mockResolvedValue([
      { title: 'Good', url: 'https://example.com/good', description: '', thumbnail: '' },
    ])

    const sources = [
      makeSource({ nameEn: 'good_source', url: 'https://good.com' }),
      makeSource({ nameEn: 'bad_source', url: 'https://bad.com' }),
    ]

    const results = await crawlAllWithPlaywright(sources)
    expect(results.size).toBe(2)
    expect(results.get('good_source')?.articles).toHaveLength(1)
    expect(results.get('bad_source')?.error).toContain('Network error')
  })

  // ── URL resolution ───────────────────────────────────────────

  it('should resolve relative URLs against the origin', async () => {
    // page.evaluate(fn, arg) — mock must call fn(arg) like Playwright does
    mockPage.evaluate.mockImplementation(
      async (_fn: (arg: unknown) => unknown, arg: unknown) => {
        const { origin } = arg as { extraction: ExtractionStrategy; origin: string }
        const url = '/relative/path'
        const resolved = new URL(url, origin).href
        return [
          { title: 'Relative Article', url: resolved, description: '', thumbnail: '' },
        ]
      },
    )

    const result = await crawlWithPlaywright(makeSource())
    expect(result.articles[0].url).toBe('https://example.com/relative/path')
  })
})