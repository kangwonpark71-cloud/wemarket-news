import { searchNaverNews, searchNaverNewsByDate } from '../naver-news-service'
import { cacheService } from '@/lib/services/cache/cache-service'

// ── Fixtures ───────────────────────────────────────────────────

const mockApiResponse = {
  title: '',
  originallink: '',
  link: '',
  description: '',
  pubDate: '',
  items: [
    {
      title: '한국 경제 <b>성장률</b> 전망',
      originallink: 'https://hankyung.com/article/123',
      link: 'https://n.news.naver.com/mnews/article/123',
      description: '한국 경제 성장률이 <b>상승</b>할 것으로 전망됩니다.',
      pubDate: 'Fri, 24 Jul 2026 09:00:00 +0900',
    },
    {
      title: '미국 증시 동향',
      originallink: 'https://example.com/article/456',
      link: 'https://n.news.naver.com/mnews/article/456',
      description: '미국 증시가 상승 마감했습니다.',
      pubDate: 'Fri, 24 Jul 2026 08:00:00 +0900',
    },
  ],
  total: 2,
  start: 1,
  display: 10,
}

// ── Mock helpers ───────────────────────────────────────────────

function makeJsonResponse(body: unknown): Response {
  return {
    ok: true, status: 200, statusText: 'OK',
    headers: new Headers(), redirected: false,
    type: 'basic' as ResponseType, url: '', body: null, bodyUsed: false,
    clone: () => makeJsonResponse(body) as unknown as Response,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response
}

function makeErrorResponse(status: number, bodyText: string) {
  return {
    ok: false, status, statusText: 'Error',
    headers: new Headers(), redirected: false,
    type: 'basic' as ResponseType, url: '', body: null, bodyUsed: false,
    clone: () => makeJsonResponse({}) as unknown as Response,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(bodyText),
  } as Response
}

// ── Mock controller ───────────────────────────────────────────

let mockImpl: ((url: URL | RequestInfo, init?: RequestInit) => Promise<Response>) | null = null

function mockFetch(
  url: URL | RequestInfo, init?: RequestInit,
): Promise<Response> {
  if (!mockImpl) throw new Error('No mock response set')
  return mockImpl(url, init)
}

function setOK(
  overrides?: Partial<{
    items: typeof mockApiResponse.items
    total: number
    start: number
    display: number
    title: string
    originallink: string
    link: string
    description: string
    pubDate: string
  }>,
) {
  const body = { ...mockApiResponse, ...overrides }
  const r = makeJsonResponse(body)
  mockImpl = () => Promise.resolve(r)
}

function setHTTPError(status: number, body: string) {
  const r = makeErrorResponse(status, body)
  mockImpl = () => Promise.resolve(r)
}

function setNetworkError() {
  mockImpl = () => Promise.reject(new Error('Network failure'))
}

// ── Env ────────────────────────────────────────────────────────

const ORIGINAL_NAVER_ID = process.env.NAVER_CLIENT_ID
const ORIGINAL_NAVER_SECRET = process.env.NAVER_CLIENT_SECRET

beforeAll(() => {
  process.env.NAVER_CLIENT_ID = 'test-client-id'
  process.env.NAVER_CLIENT_SECRET = 'test-client-secret'
})

afterAll(() => {
  if (ORIGINAL_NAVER_ID) process.env.NAVER_CLIENT_ID = ORIGINAL_NAVER_ID
  else delete process.env.NAVER_CLIENT_ID
  if (ORIGINAL_NAVER_SECRET) process.env.NAVER_CLIENT_SECRET = ORIGINAL_NAVER_SECRET
  else delete process.env.NAVER_CLIENT_SECRET
})

beforeEach(async () => {
  global.fetch = jest.fn(mockFetch)  // fresh mock per test
  mockImpl = null
  await cacheService.deleteByPattern('naver:search:*')
})

afterEach(() => {
  jest.restoreAllMocks()
})

// ── Tests ──────────────────────────────────────────────────────

describe('searchNaverNews', () => {
  it('returns empty result for empty query', async () => {
    const result = await searchNaverNews('')
    expect(result.articles).toHaveLength(0)
    expect(result.total).toBe(0)
  })

  it('fetches and normalizes articles from Naver API', async () => {
    setOK()

    const result = await searchNaverNews('한국 경제')

    expect(result.articles).toHaveLength(2)
    expect(result.total).toBe(2)
    expect(result.articles[0].title).toBe('한국 경제 성장률 전망')
    expect(result.articles[0].description).toBe('한국 경제 성장률이 상승할 것으로 전망됩니다.')
    expect(result.articles[0].url).toBe('https://n.news.naver.com/mnews/article/123')
    expect(result.articles[0].originalUrl).toBe('https://hankyung.com/article/123')
    expect(result.articles[0].source).toBe('hankyung.com')
    expect(result.articles[0].publishedAt).toBeInstanceOf(Date)
  })

  it('includes correct headers in API request', async () => {
    setOK()
    await searchNaverNews('test')

    const fetchMock = global.fetch as jest.Mock
    expect(fetchMock).toHaveBeenCalled()
    const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>
    expect(headers['X-Naver-Client-Id']).toBe('test-client-id')
    expect(headers['X-Naver-Client-Secret']).toBe('test-client-secret')
    expect(headers['Accept']).toBe('application/json')
  })

  it('sends search options correctly', async () => {
    setOK()
    await searchNaverNews('test', { display: 20, start: 5, sort: 'date' })

    const fetchMock = global.fetch as jest.Mock
    expect(fetchMock).toHaveBeenCalled()
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain('display=20')
    expect(url).toContain('start=5')
    expect(url).toContain('sort=date')
  })

  it('handles HTTP errors gracefully', async () => {
    setHTTPError(401, 'Unauthorized')
    const result = await searchNaverNews('test')
    expect(result.articles).toHaveLength(0)
    expect(result.total).toBe(0)
  })

  it('handles network errors gracefully', async () => {
    setNetworkError()
    const result = await searchNaverNews('test')
    expect(result.articles).toHaveLength(0)
    expect(result.total).toBe(0)
  })

  it('clamps display to 10-100 range', async () => {
    setOK()
    await searchNaverNews('test', { display: 5 })
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('display=10')
    await searchNaverNews('test', { display: 999 })
    expect((global.fetch as jest.Mock).mock.calls[1][0]).toContain('display=100')
  })

  it('returns cached result on repeated call with same params', async () => {
    setOK()
    const r1 = await searchNaverNews('cache test')
    expect(r1.articles).toHaveLength(2)

    mockImpl = null   // remove mock so 2nd call MUST come from cache

    const r2 = await searchNaverNews('cache test')
    expect(r2.articles).toHaveLength(2)

    const fetchMock = global.fetch as jest.Mock
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('searchNaverNewsByDate', () => {
  it('sorts by date', async () => {
    setOK()
    await searchNaverNewsByDate('test')
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string
    expect(url).toContain('sort=date')
  })
})

describe('edge cases', () => {
  it('handles missing items field', async () => {
    setOK({ items: undefined as unknown as object[] })
    const result = await searchNaverNews('test')
    expect(result.articles).toHaveLength(0)
  })

  it('handles empty items array', async () => {
    setOK({ items: [] })
    const result = await searchNaverNews('test')
    expect(result.articles).toHaveLength(0)
    expect(result.total).toBe(2)
  })

  it('extracts source domain from originallink', async () => {
    setOK()
    const result = await searchNaverNews('test')
    expect(result.articles[0].source).toBe('hankyung.com')
    expect(result.articles[1].source).toBe('example.com')
  })

  it('strips HTML entities from title', async () => {
    setOK({
      items: [{
        title: 'Test &amp; A &lt; B',
        originallink: 'https://example.com/1',
        link: 'https://example.com/1',
        description: 'desc',
        pubDate: 'Fri, 24 Jul 2026 09:00:00 +0900',
      }],
    })
    const result = await searchNaverNews('test')
    expect(result.articles[0].title).toBe('Test & A < B')
  })
})

describe('without NAVER_CLIENT_ID', () => {
  const origId = process.env.NAVER_CLIENT_ID
  const origSecret = process.env.NAVER_CLIENT_SECRET

  beforeAll(() => {
    delete process.env.NAVER_CLIENT_ID
    delete process.env.NAVER_CLIENT_SECRET
  })

  afterAll(() => {
    process.env.NAVER_CLIENT_ID = origId
    process.env.NAVER_CLIENT_SECRET = origSecret
  })

  it('returns empty result when env vars are missing', async () => {
    const result = await searchNaverNews('economy')
    expect(result.articles).toHaveLength(0)
    expect(result.total).toBe(0)
  })
})
