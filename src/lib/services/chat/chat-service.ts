/**
 * AI Chat Service
 * RAG-based economic news Q&A service using GPT-4o-mini
 */

import { prisma } from '@/lib/db';
import { cacheService } from '@/lib/services/cache/cache-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('ChatService');

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const GEMINI_OPENAI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

function getProvider(): 'openai' | 'gemini' {
  return (process.env.LLM_PROVIDER || 'openai').toLowerCase() === 'gemini' ? 'gemini' : 'openai';
}

function getApiUrl(): string {
  return getProvider() === 'gemini' ? GEMINI_OPENAI_URL : OPENAI_URL;
}

function getModel(): string {
  return process.env.LLM_MODEL || (getProvider() === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o-mini');
}

function getApiKey(): string {
  const key = getProvider() === 'gemini'
    ? process.env.GEMINI_API_KEY
    : (process.env.OPENAI_API_KEY || process.env.LLM_API_KEY);
  if (!key) throw new Error('LLM API key not configured');
  return key;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  answer: string;
  sources: { title: string; url: string; date: string }[];
}

/**
 * Search relevant articles for RAG context
 */
async function searchRelevantArticles(query: string, limit = 5) {
  const cacheKey = `chat:search:${query.toLowerCase().replace(/\s+/g, '_')}`;
  const cached = await cacheService.get<{ title: string; url: string; publishedAt: Date; source: { name: string } | null }[]>(cacheKey);
  if (cached) return cached;

  // Search by keyword matching in title, summary, category
  const keywords = query
    .replace(/[?.,!?]|\s+/g, ' ')
    .split(' ')
    .filter(Boolean);

  const where = keywords.length > 0
    ? {
        OR: keywords.map((kw) => ({
          OR: [
            { title: { contains: kw } },
            { category: { contains: kw } },
          ],
        })),
      }
    : {};

  const articles = await prisma.article.findMany({
    where,
    orderBy: { publishedAt: 'desc' },
    take: limit,
    select: {
      title: true,
      url: true,
      publishedAt: true,
      summary: true,
      source: { select: { name: true, nameEn: true } },
    },
  });

  const result = articles.map((a) => ({
    title: a.title,
    url: a.url,
    publishedAt: a.publishedAt,
    source: a.source ? { name: a.source.name || a.source.nameEn } : null,
  }));

  // Cache for 5 min
  await cacheService.set(cacheKey, result, { ttl: 300 });

  return result;
}

/**
 * Build RAG context from articles
 */
function buildRagContext(
  articles: { title: string; url: string; publishedAt: Date; source: { name: string } | null }[],
): string {
  if (articles.length === 0) return '';

  return articles
    .map(
      (a) =>
        `- [${a.source?.name || '경제뉴스'} ${a.publishedAt.toLocaleDateString('ko-KR')}] ${a.title} (${a.url})`,
    )
    .join('\n');
}

/**
 * Answer a question about economic news using RAG
 */
export async function askEconomicNews(
  messages: ChatMessage[],
): Promise<ChatResult> {
  const userQuery = messages[messages.length - 1]?.content || '';

  // Search relevant articles
  const relevantArticles = await searchRelevantArticles(userQuery);
  const ragContext = buildRagContext(relevantArticles);

  const systemPrompt = `당신은 경제 뉴스 분석 전문 AI 어시스턴트입니다. 다음 맥락의 기사들을 참고하여 사용자의 질문에 한국어로 답변해주세요.

참고 기사:
${ragContext || '(참고 기사 없음 — 일반 지식으로 답변)'}

지침:
- 답변은 간결하고 정확하게 작성하세요 (2-4문장).
- 참고 기사가 있을 경우 인용해주세요.
- 경제 용어는 한글을 우선 사용하고, 필요시 영어를 병기하세요.
- 확실하지 않은 정보는 추측하지 마세요.
- 답변은 항상 한국어로 해주세요.`;

  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ];

  try {
    const response = await fetch(getApiUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify({
        model: getModel(),
        messages: apiMessages,
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown');
      throw new Error(`LLM API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const answer = data.choices[0].message.content as string;

    return {
      answer,
      sources: relevantArticles.map((a) => ({
        title: a.title,
        url: a.url,
        date: a.publishedAt.toLocaleDateString('ko-KR'),
      })),
    };
  } catch (error) {
    log.error('Chat LLM call failed:', error);
    return {
      answer: '죄송합니다. 답변을 생성하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      sources: [],
    };
  }
}

/**
 * Save chat message to DB (for history)
 */
export async function saveChatMessage(
  sessionId: string,
  content: string,
  role: 'user' | 'assistant',
): Promise<void> {
  await prisma.chatMessage.create({
    data: { sessionId, content, role },
  });
}

/**
 * Get chat history for a user
 */
export async function getChatHistory(
  sessionId: string,
  limit = 20,
): Promise<ChatMessage[]> {
  const messages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: { content: true, role: true },
  });

  return messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
}
