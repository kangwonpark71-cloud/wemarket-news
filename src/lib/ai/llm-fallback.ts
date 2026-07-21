/**
 * LLM Fallback Service
 * Provides robust fallback mechanisms when LLM services are unavailable
 */

import { AISummaryResult } from '../ai-it/summary-service'
import { cacheService } from '@/lib/services/cache/cache-service'

export interface LLMFallbackConfig {
  maxRetries: number
  retryDelay: number
  cacheTTL: number
  enableCircuitBreaker: boolean
  circuitBreakerThreshold: number
  circuitBreakerResetTime: number
}

interface CircuitBreakerState {
  failures: number
  lastFailureTime: Date | null
  isOpen: boolean
}

const defaultConfig: LLMFallbackConfig = {
  maxRetries: 2,
  retryDelay: 1000,
  cacheTTL: 86400, // 24 hours
  enableCircuitBreaker: true,
  circuitBreakerThreshold: 5,
  circuitBreakerResetTime: 300000, // 5 minutes
}

// Circuit breaker state per service
const circuitBreakers = new Map<string, CircuitBreakerState>()

/**
 * Get circuit breaker state for a service
 */
function getCircuitBreakerState(service: string): CircuitBreakerState {
  if (!circuitBreakers.has(service)) {
    circuitBreakers.set(service, {
      failures: 0,
      lastFailureTime: null,
      isOpen: false,
    })
  }
  return circuitBreakers.get(service)!
}

/**
 * Record a failure for circuit breaker
 */
function recordFailure(service: string, config: LLMFallbackConfig): void {
  const state = getCircuitBreakerState(service)
  state.failures++
  state.lastFailureTime = new Date()

  if (state.failures >= config.circuitBreakerThreshold) {
    state.isOpen = true
    console.warn(`[LLM Circuit Breaker] ${service}: Circuit breaker opened after ${state.failures} failures`)
  }
}

/**
 * Record a success for circuit breaker
 */
function recordSuccess(service: string): void {
  const state = getCircuitBreakerState(service)
  state.failures = 0
  state.isOpen = false
  state.lastFailureTime = null
}

/**
 * Check if circuit breaker is allowing requests
 */
function isCircuitBreakerOpen(service: string, config: LLMFallbackConfig): boolean {
  const state = getCircuitBreakerState(service)
  
  if (!state.isOpen) {
    return false
  }

  // Check if reset time has passed
  if (state.lastFailureTime) {
    const timeSinceLastFailure = Date.now() - state.lastFailureTime.getTime()
    if (timeSinceLastFailure > config.circuitBreakerResetTime) {
      state.isOpen = false
      state.failures = 0
      console.log(`[LLM Circuit Breaker] ${service}: Circuit breaker reset after ${config.circuitBreakerResetTime}ms`)
      return false
    }
  }

  return true
}

/**
 * Generate rule-based summary as fallback
 */
function generateRuleBasedSummary(
  title: string,
  description?: string,
  content?: string
): AISummaryResult {
  const fullText = [title, description, content].filter(Boolean).join(' ')
  
  // Extract simple summary
  const sentences = fullText
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20)
    .slice(0, 3)
  
  const summary3Line = sentences.length > 0 
    ? sentences.join('. ') + '.'
    : title

  // Extract keywords (simple frequency-based)
  const words = fullText
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3)
  
  const wordFreq = new Map<string, number>()
  for (const word of words) {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
  }
  
  const keywords = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word)

  // Simple company extraction
  const companyPatterns = [
    'openai', 'anthropic', 'google', 'microsoft', 'meta', 'nvidia', 'apple', 'amazon',
    'tesla', 'twitter', 'facebook', 'instagram', 'tiktok', 'netflix', 'spotify',
  ]
  
  const relatedCompanies = companyPatterns
    .filter(company => fullText.toLowerCase().includes(company))
    .slice(0, 3)

  return {
    summary3Line,
    keywords,
    relatedCompanies,
    relatedModels: [], // Hard to extract without LLM
    difficulty: 'intermediate', // Default
  }
}

/**
 * Execute with retry logic
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  retryDelay: number
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt < maxRetries) {
        console.warn(`[LLM Retry] Attempt ${attempt + 1} failed, retrying in ${retryDelay}ms...`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
    }
  }

  throw lastError
}

/**
 * Main LLM fallback function with all safeguards
 */
export async function summarizeWithLLMFallback(
  title: string,
  description?: string,
  content?: string,
  config: Partial<LLMFallbackConfig> = {}
): Promise<AISummaryResult> {
  const fullConfig = { ...defaultConfig, ...config }
  const cacheKey = `llm_fallback:${title}`

  // Check cache first
  const cached = await cacheService.get<AISummaryResult>(cacheKey)
  if (cached) {
    return cached
  }

  // Check circuit breaker
  if (fullConfig.enableCircuitBreaker && isCircuitBreakerOpen('llm', fullConfig)) {
    console.warn('[LLM Fallback] Circuit breaker is open, using rule-based summary')
    const ruleBased = generateRuleBasedSummary(title, description, content)
    await cacheService.set(cacheKey, ruleBased, { ttl: fullConfig.cacheTTL })
    return ruleBased
  }

  try {
    // Try LLM with retries
    const result = await withRetry(async () => {
      const { summarizeWithLLM } = await import('./llm-service')
      return summarizeWithLLM(title, description, content)
    }, fullConfig.maxRetries, fullConfig.retryDelay)

    // Record success
    recordSuccess('llm')
    
    // Cache result
    await cacheService.set(cacheKey, result, { ttl: fullConfig.cacheTTL })
    
    return result
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    
    // Record failure
    if (fullConfig.enableCircuitBreaker) {
      recordFailure('llm', fullConfig)
    }
    
    console.error('[LLM Fallback] All attempts failed:', err.message)
    
    // Fall back to rule-based
    const ruleBased = generateRuleBasedSummary(title, description, content)
    await cacheService.set(cacheKey, ruleBased, { ttl: fullConfig.cacheTTL })
    
    return ruleBased
  }
}

/**
 * Get circuit breaker status for monitoring
 */
export function getCircuitBreakerStatus(): Record<string, CircuitBreakerState> {
  return Object.fromEntries(circuitBreakers)
}

/**
 * Reset circuit breaker for a service (for manual intervention)
 */
export function resetCircuitBreaker(service: string): void {
  const state = getCircuitBreakerState(service)
  state.failures = 0
  state.isOpen = false
  state.lastFailureTime = null
  console.log(`[LLM Circuit Breaker] ${service}: Circuit breaker manually reset`)
}
