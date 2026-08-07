import type { AISummaryResult } from '../ai-it/summary-service'
import { createLogger } from '@/lib/logger';

const log = createLogger('LLMService')

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const GEMINI_OPENAI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'

type LLMProvider = 'openai' | 'gemini'

function getProvider(): LLMProvider {
  return (process.env.LLM_PROVIDER || 'openai').toLowerCase() === 'gemini' ? 'gemini' : 'openai'
}

function getApiUrl(): string {
  return getProvider() === 'gemini' ? GEMINI_OPENAI_URL : OPENAI_URL
}

function getModel(): string {
  return process.env.LLM_MODEL || (getProvider() === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o-mini')
}

function getApiKey(): string {
  const key = getProvider() === 'gemini'
    ? process.env.GEMINI_API_KEY
    : (process.env.OPENAI_API_KEY || process.env.LLM_API_KEY)
  if (!key) {
    throw new Error('LLM API key not configured. Set OPENAI_API_KEY/LLM_API_KEY or GEMINI_API_KEY for gemini provider')
  }
  return key
}

function buildPrompt(title: string, description?: string, content?: string): string {
  return `You are an AI/IT news analyst. Translate the title to Korean and summarize the following article in Korean.

Title: ${title}
Description: ${description || '(none)'}
Body: ${content || '(none)'}

Respond in JSON only:
{
  "translatedTitle": "Korean translated title of the article",
  "summary3Line": "3-line Korean summary, ~80 chars each line",
  "keywords": ["keyword1", "keyword2", ...],
  "relatedCompanies": ["company1", "company2", ...],
  "relatedModels": ["model1", "model2", ...],
  "difficulty": "beginner|intermediate|advanced"
}`
}

export async function summarizeWithLLM(
  title: string,
  description?: string,
  content?: string
): Promise<AISummaryResult> {
  const prompt = buildPrompt(title, description, content)

  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: getModel(),
      messages: [
        { role: 'system', content: 'You are a helpful AI/IT news analyst. Respond only with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 500,
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => 'unknown')
    throw new Error(`LLM API error ${response.status}: ${errText}`)
  }

  const data = await response.json()
  const responseContent = data.choices[0].message.content as string
  const parsed = JSON.parse(responseContent) as AISummaryResult

  return {
    translatedTitle: parsed.translatedTitle,
    summary3Line: parsed.summary3Line || '요약 실패',
    keywords: parsed.keywords || [],
    relatedCompanies: parsed.relatedCompanies || [],
    relatedModels: parsed.relatedModels || [],
    difficulty: parsed.difficulty || 'intermediate',
  }
}

const QUICK_TRANSLATE_PROMPT = `Translate the following English news title to Korean. Return ONLY valid JSON:

{
  "translatedTitle": "Korean translation of the title"
}

Title:`

export async function translateTitleQuick(title: string): Promise<string> {
  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: getModel(),
      messages: [
        { role: 'system', content: 'You are a professional translator. Translate English news titles to natural Korean. Respond only with valid JSON.' },
        { role: 'user', content: `${QUICK_TRANSLATE_PROMPT} ${title}"` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 100,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => 'unknown');
    throw new Error(`LLM API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const parsed = JSON.parse(data.choices[0].message.content) as { translatedTitle?: string };
  return parsed.translatedTitle || title;
}

export async function translateFullContent(title: string, content: string): Promise<string> {
  const truncated = content.length > 12000 ? content.substring(0, 12000) + '\n...(truncated)' : content

  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: getModel(),
      messages: [
        {
          role: 'system',
          content:
            'You are a professional Korean translator. Translate the following English news article into natural, fluent Korean. Preserve the article structure (paragraphs). Do NOT add any commentary or explanation — return ONLY the Korean translation.',
        },
        {
          role: 'user',
          content: `Translate this English news article to Korean:\n\nTitle: ${title}\n\nContent:\n${truncated}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 4000,
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => 'unknown')
    throw new Error(`LLM API error ${response.status}: ${errText}`)
  }

  const data = await response.json()
  return data.choices[0].message.content || ''
}

export async function summarizeWithLLMFallback(
  title: string,
  description?: string,
  content?: string
): Promise<AISummaryResult> {
  try {
    return await summarizeWithLLM(title, description, content)
  } catch (err) {
    log.warn('[LLM] API call failed, falling back to rule-based summary:', err)
    const { generateAISummary } = await import('../ai-it/summary-service')
    return generateAISummary(title, description, content)
  }
}
