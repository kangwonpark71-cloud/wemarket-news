/**
 * AI Summary Service Tests
 *
 * Tests for pure functions in summary-service.ts:
 * - generateAISummary: rule-based summary with cache handling
 * - generateAISummaryWithLLM: LLM fallback to rule-based
 * - getSummaryPrompt: prompt template generation
 */

// Mock cache service - jest.mock is hoisted, so factory must be inline
jest.mock('@/lib/services/cache/cache-service', () => {
  const mockGet = jest.fn()
  const mockSet = jest.fn()
  return {
    cacheService: {
      get: mockGet,
      set: mockSet,
    },
    __mockGet: mockGet,
    __mockSet: mockSet,
  }
})

import {
  generateAISummary,
  generateAISummaryWithLLM,
  getSummaryPrompt,
  type AISummaryResult,
} from '@/lib/ai-it/summary-service'

// Get mock references from the hoisted mock factory
const { cacheService } = jest.requireMock('@/lib/services/cache/cache-service')

describe('summary-service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('generateAISummary', () => {
    const title = 'OpenAI Releases GPT-5 with Breakthrough Reasoning Capabilities'
    const description =
      'OpenAI has announced GPT-5, featuring significant improvements in reasoning, multilingual understanding, and code generation.'
    const content =
      'OpenAI today unveiled GPT-5, the latest iteration of its large language model. The new model demonstrates remarkable advances in chain-of-thought reasoning, mathematical problem-solving, and multilingual translation. Early benchmarks show a 40% improvement over GPT-4 on complex reasoning tasks. The model also introduces enhanced safety features and improved factuality. Industry experts at NVIDIA and Microsoft have praised the release as a major step forward in artificial intelligence.'

    it('returns rule-based summary with keywords, companies, models, and difficulty', async () => {
      cacheService.get.mockResolvedValue(null)
      cacheService.set.mockResolvedValue(undefined)

      const result = await generateAISummary(title, description, content)

      expect(result).toHaveProperty('summary3Line')
      expect(result).toHaveProperty('keywords')
      expect(result).toHaveProperty('relatedCompanies')
      expect(result).toHaveProperty('relatedModels')
      expect(result).toHaveProperty('difficulty')

      expect(typeof result.summary3Line).toBe('string')
      expect(result.summary3Line.length).toBeGreaterThan(0)
      expect(Array.isArray(result.keywords)).toBe(true)
      expect(Array.isArray(result.relatedCompanies)).toBe(true)
      expect(Array.isArray(result.relatedModels)).toBe(true)

      // Should detect OpenAI, NVIDIA, Microsoft in text
      expect(result.relatedCompanies).toContain('OpenAI')
      expect(result.relatedCompanies).toContain('NVIDIA')
      expect(result.relatedCompanies).toContain('Microsoft')

      // Should detect GPT-4, GPT models
      expect(result.relatedModels.some((m: string) => m.includes('GPT'))).toBe(true)

      // Should cache the result
      expect(cacheService.set).toHaveBeenCalledWith(
        expect.stringContaining('ai_summary:'),
        result,
        expect.objectContaining({ ttl: 86400 }),
      )
    })

    it('returns cached result when available', async () => {
      const cached: AISummaryResult = {
        summary3Line: 'Cached summary.',
        keywords: ['cached'],
        relatedCompanies: [],
        relatedModels: [],
        difficulty: 'beginner',
      }
      cacheService.get.mockResolvedValue(cached)

      const result = await generateAISummary(title, description, content)

      expect(result).toEqual(cached)
      expect(cacheService.set).not.toHaveBeenCalled()
    })

    it('handles minimal input (title only)', async () => {
      cacheService.get.mockResolvedValue(null)
      cacheService.set.mockResolvedValue(undefined)

      const result = await generateAISummary('Short title')

      expect(result.summary3Line).toBeTruthy()
      expect(result.keywords.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('generateAISummaryWithLLM', () => {
    const title = 'Test Article Title'
    const description = 'Test description'

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('falls back to rule-based when LLM import fails', async () => {
      cacheService.get.mockResolvedValue(null)
      cacheService.set.mockResolvedValue(undefined)

      // The dynamic import inside the function will fail because llm-fallback
      // doesn't exist or isn't configured. This should trigger the fallback.
      const result = await generateAISummaryWithLLM(title, description)

      // Should still return a valid result via rule-based fallback
      expect(result).toHaveProperty('summary3Line')
      expect(result).toHaveProperty('keywords')
      expect(typeof result.summary3Line).toBe('string')
    })
  })

  describe('getSummaryPrompt', () => {
    it('generates prompt with title, description, and content', () => {
      const prompt = getSummaryPrompt('GPT-5 Released', 'New AI model', 'Details about GPT-5...')

      expect(prompt).toContain('GPT-5 Released')
      expect(prompt).toContain('New AI model')
      expect(prompt).toContain('Details about GPT-5...')
      expect(prompt).toContain('summary3Line')
      expect(prompt).toContain('difficulty')
    })

    it('handles missing optional fields', () => {
      const prompt = getSummaryPrompt('Just a title')

      expect(prompt).toContain('Just a title')
      expect(prompt).toContain('없음')
    })
  })
})