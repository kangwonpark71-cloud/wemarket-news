import { generateAISummary, getSummaryPrompt, type AISummaryResult } from '../summary-service'

// Mock cache service
jest.mock('@/lib/services/cache/cache-service', () => ({
  cacheService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  },
}))

describe('summary-service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('generateAISummary — rule-based', () => {
    it('generates 3-line summary from title + description', async () => {
      const result = await generateAISummary(
        'GPT-4o achieves breakthrough in multimodal reasoning',
        'OpenAI has released a new model that can process text, images, and audio simultaneously with human-level accuracy across all modalities.'
      )
      expect(result.summary3Line).toBeTruthy()
      expect(result.summary3Line.split('.').length).toBeGreaterThanOrEqual(2)
      expect(result.keywords.length).toBeGreaterThan(0)
    })

    it('extracts companies from text', async () => {
      const result = await generateAISummary(
        'OpenAI and Google announce new AI safety frameworks',
        'OpenAI, Google, and Microsoft have jointly published new guidelines for responsible AI development.'
      )
      expect(result.relatedCompanies).toContain('OpenAI')
      expect(result.relatedCompanies).toContain('Google')
      expect(result.relatedCompanies).toContain('Microsoft')
      expect(result.relatedCompanies.length).toBeLessThanOrEqual(5)
    })

    it('extracts model names from text', async () => {
      const result = await generateAISummary(
        'Claude 3.5 vs GPT-4o: A comprehensive comparison',
        'This paper compares the performance of Claude 3.5, GPT-4, and Gemini Pro across multiple benchmarks.'
      )
      expect(result.relatedModels).toContain('Claude 3')
      expect(result.relatedModels).toContain('GPT-4')
    })

    it('determines difficulty level correctly', async () => {
      const beginner = await generateAISummary(
        'Getting started with AI: A beginner tutorial',
        'This introduction covers the basics of what you need to know about artificial intelligence.'
      )
      expect(beginner.difficulty).toBe('beginner')

      const advanced = await generateAISummary(
        'Novel transformer architecture: A theoretical proof',
        'This research paper presents a novel state-of-the-art approach to transformer convergence with mathematical proof.'
      )
      expect(advanced.difficulty).toBe('advanced')
    })

    it('handles minimal input gracefully', async () => {
      const result = await generateAISummary('Short title')
      expect(result.summary3Line).toBeTruthy()
      expect(Array.isArray(result.keywords)).toBe(true)
      expect(Array.isArray(result.relatedCompanies)).toBe(true)
      expect(Array.isArray(result.relatedModels)).toBe(true)
    })

    it('caches results', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const cacheService = require('@/lib/services/cache/cache-service').cacheService
      cacheService.get.mockResolvedValueOnce({
        summary3Line: 'Cached summary.',
        keywords: ['cached'],
        relatedCompanies: [],
        relatedModels: [],
        difficulty: 'beginner',
      } as AISummaryResult)

      const result = await generateAISummary('Same title for caching test', 'description')
      expect(result.summary3Line).toBe('Cached summary.')
      expect(cacheService.get).toHaveBeenCalledWith('ai_summary:Same title for caching test')
      expect(cacheService.set).not.toHaveBeenCalled()
    })
  })

  describe('generateAISummaryWithLLM — LLM fallback', () => {
    it('falls back to rule-based when LLM fails', async () => {
      jest.isolateModules(async () => {
        jest.mock('@/lib/ai/llm-service', () => ({
          summarizeWithLLMFallback: jest.fn().mockRejectedValue(new Error('API unavailable')),
        }))

        const { generateAISummaryWithLLM: fallback } = await import('../summary-service')
        const result = await fallback('Test title', 'Test description')
        expect(result.summary3Line).toBeTruthy()
        expect(result.keywords).toBeDefined()
      })
    })
  })

  describe('getSummaryPrompt', () => {
    it('generates prompt with title and description', () => {
      const prompt = getSummaryPrompt('Test', 'Description', 'Content')
      expect(prompt).toContain('Test')
      expect(prompt).toContain('Description')
      expect(prompt).toContain('Content')
      expect(prompt).toContain('summary3Line')
      expect(prompt).toContain('keywords')
    })

    it('handles missing optional fields', () => {
      const prompt = getSummaryPrompt('Just a title')
      expect(prompt).toContain('Just a title')
      expect(prompt).toContain('없음')
    })
  })
})