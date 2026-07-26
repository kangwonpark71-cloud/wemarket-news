import type { AISummaryResult } from '../ai-it/summary-service'

const LLM_API_URL = 'https://api.openai.com/v1/chat/completions'

function getApiKey(): string {
  const key = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY
  if (!key) {
    throw new Error('LLM API key not configured. Set OPENAI_API_KEY or LLM_API_KEY')
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

  const response = await fetch(LLM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
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
  const parsed: AISummaryResult = JSON.parse(data.choices[0].message.content)

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
  const response = await fetch(LLM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
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
  const parsed = JSON.parse(data.choices[0].message.content);
  return parsed.translatedTitle || title;
}

export async function summarizeWithLLMFallback(
  title: string,
  description?: string,
  content?: string
): Promise<AISummaryResult> {
  try {
    return await summarizeWithLLM(title, description, content)
  } catch (err) {
    console.warn('[LLM] API call failed, falling back to rule-based summary:', err)
    const { generateAISummary } = await import('../ai-it/summary-service')
    return generateAISummary(title, description, content)
  }
}
