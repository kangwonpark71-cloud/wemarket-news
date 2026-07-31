import {
  summarizeWithLLM,
  translateTitleQuick,
  translateFullContent,
  summarizeWithLLMFallback,
} from '../llm-service'

const LLM_API_URL = 'https://api.openai.com/v1/chat/completions'
const originalFetch = global.fetch

// jsdom test env has no global fetch — mock it by default so the
// `fetch` identifier resolves; individual tests override the return.
beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: jest.fn().mockResolvedValue(''),
    json: jest.fn().mockResolvedValue({ choices: [{ message: { content: '{}' } }] }),
  })
})

afterEach(() => {
  global.fetch = originalFetch
})

function mockFetchResponse(body: unknown, ok = true, status = 200) {
  return jest.fn().mockResolvedValue({
    ok,
    status,
    text: jest.fn().mockResolvedValue('mock error body'),
    json: jest.fn().mockResolvedValue(body),
  })
}

describe('summarizeWithLLM', () => {
  const originalOpenAIKey = process.env.OPENAI_API_KEY
  const originalLLMKey = process.env.LLM_API_KEY

  afterAll(() => {
    if (originalOpenAIKey === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = originalOpenAIKey
    if (originalLLMKey === undefined) delete process.env.LLM_API_KEY
    else process.env.LLM_API_KEY = originalLLMKey
  })

  it('should throw when no API key is configured', async () => {
    delete process.env.OPENAI_API_KEY
    delete process.env.LLM_API_KEY
    await expect(summarizeWithLLM('Test Title')).rejects.toThrow('LLM API key not configured')
  })

  it('should POST to the OpenAI chat completions endpoint with the right payload shape', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    global.fetch = mockFetchResponse({
      choices: [
        {
          message: {
            content: JSON.stringify({
              translatedTitle: '테스트 제목',
              summary3Line: '요약입니다',
              keywords: ['AI'],
              relatedCompanies: ['OpenAI'],
              relatedModels: ['GPT-4o'],
              difficulty: 'beginner',
            }),
          },
        },
      ],
    })

    const result = await summarizeWithLLM('Test Title', 'Desc', 'Body')

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe(LLM_API_URL)
    expect(init.headers.Authorization).toBe('Bearer test-key')
    const body = JSON.parse(init.body)
    expect(body.model).toBe('gpt-4o-mini')
    expect(body.response_format).toEqual({ type: 'json_object' })
    expect(body.messages[1].content).toContain('Test Title')

    expect(result.translatedTitle).toBe('테스트 제목')
    expect(result.summary3Line).toBe('요약입니다')
    expect(result.keywords).toEqual(['AI'])
    expect(result.difficulty).toBe('beginner')
  })

  it('should apply defaults for missing fields', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    global.fetch = mockFetchResponse({
      choices: [{ message: { content: JSON.stringify({ translatedTitle: '제목' }) } }],
    })

    const result = await summarizeWithLLM('Title')
    expect(result.summary3Line).toBe('요약 실패')
    expect(result.keywords).toEqual([])
    expect(result.difficulty).toBe('intermediate')
  })

  it('should throw with status when the API returns an error', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    global.fetch = mockFetchResponse({}, false, 429)
    await expect(summarizeWithLLM('Title')).rejects.toThrow('LLM API error 429')
  })
})

describe('translateTitleQuick', () => {
  it('should return the translated title', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    global.fetch = mockFetchResponse({
      choices: [{ message: { content: JSON.stringify({ translatedTitle: '한국어 제목' }) } }],
    })

    const result = await translateTitleQuick('English Title')
    expect(result).toBe('한국어 제목')
  })

  it('should fall back to the original title when parsing fails', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    global.fetch = mockFetchResponse({
      choices: [{ message: { content: JSON.stringify({}) } }],
    })

    expect(await translateTitleQuick('Keep Me')).toBe('Keep Me')
  })
})

describe('translateFullContent', () => {
  it('should return the translated content', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    global.fetch = mockFetchResponse({
      choices: [{ message: { content: '번역된 본문' } }],
    })

    expect(await translateFullContent('Title', 'body')).toBe('번역된 본문')
  })

  it('should truncate content longer than 12000 chars', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    global.fetch = mockFetchResponse({
      choices: [{ message: { content: 'OK' } }],
    })

    const longContent = 'a'.repeat(20000)
    await translateFullContent('Title', longContent)
    const [, init] = (global.fetch as jest.Mock).mock.calls[0]
    const body = JSON.parse(init.body)
    expect(body.messages[1].content).toContain('...(truncated)')
    expect(body.messages[1].content.length).toBeLessThan(13000)
  })
})

describe('summarizeWithLLMFallback', () => {
  it('should return the LLM result on success', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    global.fetch = mockFetchResponse({
      choices: [{ message: { content: JSON.stringify({ translatedTitle: '제목' }) } }],
    })

    const result = await summarizeWithLLMFallback('Title')
    expect(result.translatedTitle).toBe('제목')
  })

  it('should fall back to rule-based summary when the LLM call fails', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    global.fetch = mockFetchResponse({}, false, 500)

    const result = await summarizeWithLLMFallback('Some AI Model Title', 'desc', 'content')
    expect(result.summary3Line).toBeTruthy()
    expect(result.difficulty).toBeTruthy()
  })
})
