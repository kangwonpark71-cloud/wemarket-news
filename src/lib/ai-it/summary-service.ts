import { cacheService } from '@/lib/services/cache/cache-service';

export interface AISummaryResult {
  translatedTitle?: string;
  summary3Line: string;
  keywords: string[];
  relatedCompanies: string[];
  relatedModels: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

const COMPANY_KEYWORDS = [
  'OpenAI', 'Anthropic', 'Google', 'DeepMind', 'Microsoft', 'Meta', 'NVIDIA', 'Hugging Face',
  'Amazon', 'Apple', 'IBM', 'Intel', 'AMD', 'Qualcomm', 'Stability AI', 'Midjourney',
  'Runway', 'Cohere', 'Adept', 'Inflection', 'Character.AI', 'Mistral', 'Databricks',
  'Snowflake', 'MongoDB', 'Redis', 'Elastic', 'Confluent', 'HashiCorp',
];

const MODEL_KEYWORDS = [
  'GPT-4', 'GPT-4o', 'GPT-3.5', 'Claude', 'Claude 3', 'Claude 3.5', 'Gemini', 'Gemini Pro',
  'Llama', 'Llama 2', 'Llama 3', 'Mistral', 'Mixtral', 'Phi', 'Phi-3', 'Gemma', 'Qwen',
  'Yi', 'Baichuan', 'ChatGLM', 'DALL-E', 'Midjourney', 'Stable Diffusion', 'Sora',
  'Whisper', 'Codex', 'Copilot', 'Transformer', 'BERT', 'T5', 'PaLM', 'LaMDA',
];

const DIFFICULTY_INDICATORS = {
  beginner: ['introduction', 'getting started', 'beginner', 'tutorial', 'basics', 'overview', 'what is', 'how to'],
  intermediate: ['guide', 'deep dive', 'implementation', 'best practices', 'architecture', 'optimization', 'fine-tuning', 'rag'],
  advanced: ['research', 'paper', 'novel', 'state-of-the-art', 'sota', 'benchmark', 'theoretical', 'proof', 'convergence', 'mathematical'],
};

function extractCompanies(text: string): string[] {
  const found = new Set<string>();
  const lowerText = text.toLowerCase();
  
  for (const company of COMPANY_KEYWORDS) {
    if (lowerText.includes(company.toLowerCase())) {
      found.add(company);
    }
  }
  
  return Array.from(found).slice(0, 5);
}

function extractModels(text: string): string[] {
  const found = new Set<string>();
  const lowerText = text.toLowerCase();
  
  for (const model of MODEL_KEYWORDS) {
    if (lowerText.includes(model.toLowerCase())) {
      found.add(model);
    }
  }
  
  return Array.from(found).slice(0, 5);
}

function determineDifficulty(text: string): 'beginner' | 'intermediate' | 'advanced' {
  const lowerText = text.toLowerCase();
  const scores = { beginner: 0, intermediate: 0, advanced: 0 };
  
  for (const [level, keywords] of Object.entries(DIFFICULTY_INDICATORS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        scores[level as keyof typeof scores]++;
      }
    }
  }
  
  const maxLevel = Object.entries(scores).reduce((a, b) => scores[a[0] as keyof typeof scores] > scores[b[0] as keyof typeof scores] ? a : b)[0];
  return maxLevel as 'beginner' | 'intermediate' | 'advanced';
}

function extractKeywords(text: string, maxKeywords = 10): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'from', 'as', 'is', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does',
    'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
    'these', 'those', 'it', 'its', 'we', 'you', 'they', 'them', 'their', 'our', 'your', 'my',
    'i', 'he', 'she', 'his', 'her', 'me', 'us', 'am', 'is', 'are', 'was', 'were', 'been',
    'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'will', 'would',
    'should', 'could', 'may', 'might', 'must', 'can', 'need', 'dare', 'ought', 'used',
  ]);
  
  const words = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
    .filter(w => !/^\d+$/.test(w));
  
  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }
  
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

function generateSimpleSummary(text: string, sentences = 3): string {
  const sentencesList = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20);
  
  if (sentencesList.length <= sentences) {
    return sentencesList.join('. ') + '.';
  }
  
  return sentencesList.slice(0, sentences).join('. ') + '.';
}

export async function generateAISummary(
  title: string,
  description?: string,
  content?: string
): Promise<AISummaryResult> {
  const cacheKey = `ai_summary:${title}`;
  const cached = await cacheService.get<AISummaryResult>(cacheKey);
  if (cached) return cached;
  
  const fullText = [title, description, content].filter(Boolean).join(' ');
  
  const summary3Line = generateSimpleSummary(fullText, 3);
  const keywords = extractKeywords(fullText, 10);
  const relatedCompanies = extractCompanies(fullText);
  const relatedModels = extractModels(fullText);
  const difficulty = determineDifficulty(fullText);
  
  const result: AISummaryResult = {
    summary3Line,
    keywords,
    relatedCompanies,
    relatedModels,
    difficulty,
  };
  
  await cacheService.set(cacheKey, result, { ttl: 86400 });
  
  return result;
}

export async function generateAISummaryWithLLM(
  title: string,
  description?: string,
  content?: string
): Promise<AISummaryResult> {
  try {
    const { summarizeWithLLMFallback } = await import('@/lib/ai/llm-service');
    return await summarizeWithLLMFallback(title, description, content);
  } catch (llmErr) {
    console.warn('[AISummary] LLM summarization failed, falling back to rule-based:', llmErr instanceof Error ? llmErr.message : llmErr);
    return generateAISummary(title, description, content);
  }
}

export function getSummaryPrompt(title: string, description?: string, content?: string): string {
  return `다음 AI/IT 뉴스 기사를 분석하여 한국어로 요약해주세요.

제목: ${title}
설명: ${description || '없음'}
본문: ${content || '없음'}

다음 형식으로 JSON 응답해주세요:
{
  "summary3Line": "핵심 내용을 3줄로 요약 (각 줄은 80자 내외)",
  "keywords": ["핵심키워드1", "핵심키워드2", ...],
  "relatedCompanies": ["관련기업1", "관련기업2", ...],
  "relatedModels": ["관련모델1", "관련모델2", ...],
  "difficulty": "beginner|intermediate|advanced"
}

요약은 반드시 한국어로, 3줄 이내로 작성해주세요.`;
}