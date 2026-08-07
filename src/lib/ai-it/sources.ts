// AI & IT News Sources Configuration
// Centralized management of all AI/IT news RSS feeds and crawler targets

export interface AIITSourceConfig {
  name: string;
  nameEn: string;
  url: string;
  category: 'ai' | 'it';
  subcategory: string;
  language: 'ko' | 'en';
  icon?: string;
  fetchInterval: number; // hours
  type: 'rss' | 'crawler';
  crawlerConfig?: {
    selector: string;
    titleSelector: string;
    linkSelector: string;
    descriptionSelector?: string;
    thumbnailSelector?: string;
    dateSelector?: string;
    pagination?: {
      type: 'page' | 'scroll';
      maxPages?: number;
    };
  };
}

// =============================================
// AI News Sources - Official Company Blogs
// =============================================

export const AI_OFFICIAL_SOURCES: AIITSourceConfig[] = [
  // OpenAI
  {
    name: 'OpenAI Blog',
    nameEn: 'openai_blog',
    url: 'https://openai.com/blog/rss.xml',
    category: 'ai',
    subcategory: 'openai',
    language: 'en',
    icon: '🤖',
    fetchInterval: 1, // 15 minutes = 0.25 hours, but minimum 1 hour for RSS
    type: 'rss',
  },
  // Anthropic
  {
    name: 'Anthropic News',
    nameEn: 'anthropic_news',
    url: 'https://rsshub.bestblogs.dev/anthropic/news',
    category: 'ai',
    subcategory: 'anthropic',
    language: 'en',
    icon: '🧠',
    fetchInterval: 1,
    type: 'rss',
  },
  // Google AI
  {
    name: 'Google AI Blog',
    nameEn: 'google_ai_blog',
    url: 'https://blog.google/technology/ai/rss/',
    category: 'ai',
    subcategory: 'google_ai',
    language: 'en',
    icon: '🌈',
    fetchInterval: 1,
    type: 'rss',
  },
  // Google DeepMind
  {
    name: 'DeepMind Blog',
    nameEn: 'deepmind_blog',
    url: 'https://deepmind.google/blog/rss.xml',
    category: 'ai',
    subcategory: 'deepmind',
    language: 'en',
    icon: '🧬',
    fetchInterval: 1,
    type: 'rss',
  },
  // Microsoft AI
  {
    name: 'Microsoft AI Blog',
    nameEn: 'microsoft_ai_blog',
    url: 'https://news.google.com/rss/search?q=site%3Ablogs.microsoft.com&hl=en-US&gl=US&ceid=US:en',
    category: 'ai',
    subcategory: 'microsoft_ai',
    language: 'en',
    icon: '🪟',
    fetchInterval: 2, // 30 minutes = 0.5 hours, minimum 1
    type: 'rss',
  },
  // Meta AI
  {
    name: 'Meta AI Blog',
    nameEn: 'meta_ai_blog',
    url: 'https://news.google.com/rss/search?q=site%3Aai.meta.com&hl=en-US&gl=US&ceid=US:en',
    category: 'ai',
    subcategory: 'meta_ai',
    language: 'en',
    icon: '📘',
    fetchInterval: 2,
    type: 'rss',
  },
  // NVIDIA AI
  {
    name: 'NVIDIA AI Blog',
    nameEn: 'nvidia_ai_blog',
    url: 'https://blogs.nvidia.com/feed/',
    category: 'ai',
    subcategory: 'nvidia',
    language: 'en',
    icon: '🟢',
    fetchInterval: 2,
    type: 'rss',
  },
  // Hugging Face
  {
    name: 'Hugging Face Blog',
    nameEn: 'huggingface_blog',
    url: 'https://huggingface.co/blog/feed.xml',
    category: 'ai',
    subcategory: 'huggingface',
    language: 'en',
    icon: '🤗',
    fetchInterval: 2,
    type: 'rss',
  },
];

// =============================================
// AI Technology News Sources
// =============================================

export const AI_TECH_SOURCES: AIITSourceConfig[] = [
  {
    name: 'AI 타임스',
    nameEn: 'ai_times',
    url: 'https://www.aitimes.com/rss/allArticle.xml',
    category: 'ai',
    subcategory: 'ai_industry',
    language: 'ko',
    icon: '📰',
    fetchInterval: 1,
    type: 'rss',
  },
  // VentureBeat AI
  {
    name: 'VentureBeat AI',
    nameEn: 'venturebeat_ai',
    url: 'https://venturebeat.com/category/ai/feed/',
    category: 'ai',
    subcategory: 'ai_industry',
    language: 'en',
    icon: '📰',
    fetchInterval: 1,
    type: 'rss',
  },
  // The Verge AI
  {
    name: 'The Verge AI',
    nameEn: 'theverge_ai',
    url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',
    category: 'ai',
    subcategory: 'ai_industry',
    language: 'en',
    icon: '📱',
    fetchInterval: 1,
    type: 'rss',
  },
  // TechCrunch AI
  {
    name: 'TechCrunch AI',
    nameEn: 'techcrunch_ai',
    url: 'https://techcrunch.com/tag/artificial-intelligence/feed/',
    category: 'ai',
    subcategory: 'ai_startups',
    language: 'en',
    icon: '🚀',
    fetchInterval: 1,
    type: 'rss',
  },
  // Ars Technica AI
  {
    name: 'Ars Technica AI',
    nameEn: 'arstechnica_ai',
    url: 'https://feeds.arstechnica.com/arstechnica/technology-lab',
    category: 'ai',
    subcategory: 'ai_research',
    language: 'en',
    icon: '🔬',
    fetchInterval: 1,
    type: 'rss',
  },
  // MIT Technology Review AI
  {
    name: 'MIT Tech Review AI',
    nameEn: 'mit_tech_review_ai',
    url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed/',
    category: 'ai',
    subcategory: 'ai_research',
    language: 'en',
    icon: '🎓',
    fetchInterval: 2,
    type: 'rss',
  },
  // KDnuggets
  {
    name: 'KDnuggets',
    nameEn: 'kdnuggets',
    url: 'https://www.kdnuggets.com/feed',
    category: 'ai',
    subcategory: 'ai_research',
    language: 'en',
    icon: '📊',
    fetchInterval: 2,
    type: 'rss',
  },
  // Papers With Code
  {
    name: 'Papers With Code',
    nameEn: 'papers_with_code',
    url: 'https://news.google.com/rss/search?q=%22papers%20with%20code%22&hl=en-US&gl=US&ceid=US:en',
    category: 'ai',
    subcategory: 'llm',
    language: 'en',
    icon: '📄',
    fetchInterval: 1,
    type: 'rss',
  },
  // AI Agents News (using crawler since no RSS)
  {
    name: 'AI Agents Directory',
    nameEn: 'ai_agents_dir',
    url: 'https://aiagentsdirectory.com/',
    category: 'ai',
    subcategory: 'ai_agents',
    language: 'en',
    icon: '🤖',
    fetchInterval: 1,
    type: 'crawler',
    crawlerConfig: {
      selector: '.agent-card',
      titleSelector: 'h3',
      linkSelector: 'a',
      descriptionSelector: '.description',
      pagination: { type: 'page', maxPages: 3 },
    },
  },
  // Robotics News
  {
    name: 'IEEE Spectrum Robotics',
    nameEn: 'ieee_robotics',
    url: 'https://spectrum.ieee.org/feeds/topic/robotics.xml',
    category: 'ai',
    subcategory: 'robotics',
    language: 'en',
    icon: '🦾',
    fetchInterval: 2,
    type: 'rss',
  },
  // ProductHunt AI (JS-rendered, no RSS)
  {
    name: 'ProductHunt AI',
    nameEn: 'producthunt_ai',
    url: 'https://www.producthunt.com/topics/artificial-intelligence',
    category: 'ai',
    subcategory: 'ai_tools',
    language: 'en',
    icon: '🦄',
    fetchInterval: 1,
    type: 'crawler',
    crawlerConfig: {
      selector: 'article[class*="post"]',
      titleSelector: 'a[class*="title"]',
      linkSelector: 'a[class*="title"]',
      descriptionSelector: '[class*="tagline"]',
      thumbnailSelector: 'img[class*="thumbnail"]',
      pagination: { type: 'scroll', maxPages: 2 },
    },
  },
  // Futurepedia AI Tools (directory, JS-rendered)
  {
    name: 'Futurepedia',
    nameEn: 'futurepedia',
    url: 'https://www.futurepedia.io/',
    category: 'ai',
    subcategory: 'ai_tools',
    language: 'en',
    icon: '🔧',
    fetchInterval: 2,
    type: 'crawler',
    crawlerConfig: {
      selector: '[class*="tool-card"], [class*="tool"]',
      titleSelector: 'h3, h4, [class*="title"]',
      linkSelector: 'a[href*="http"]',
      descriptionSelector: 'p, [class*="description"]',
      thumbnailSelector: 'img',
      pagination: { type: 'scroll', maxPages: 2 },
    },
  },
  // AI News aggregator
  {
    name: 'AI News Hub',
    nameEn: 'ai_news_hub',
    url: 'https://news.google.com/rss/search?q=site%3Aartificialintelligence-news.com&hl=en-US&gl=US&ceid=US:en',
    category: 'ai',
    subcategory: 'ai_industry',
    language: 'en',
    icon: '📡',
    fetchInterval: 1,
    type: 'rss',
  },
];

// =============================================
// IT News Sources - Korean
// =============================================

export const IT_KOREAN_SOURCES: AIITSourceConfig[] = [
  // 블로터
  {
    name: '블로터',
    nameEn: 'bloter',
    url: 'https://news.google.com/rss/search?q=site%3Abloter.net&hl=ko&gl=KR&ceid=KR:ko',
    category: 'it',
    subcategory: 'korean_it',
    language: 'ko',
    icon: '🇰🇷',
    fetchInterval: 1,
    type: 'rss',
  },
  // 지디넷코리아
  {
    name: '지디넷코리아',
    nameEn: 'zdnet_korea',
    url: 'http://feeds.feedburner.com/zdkorea',
    category: 'it',
    subcategory: 'korean_it',
    language: 'ko',
    icon: '💻',
    fetchInterval: 1,
    type: 'rss',
  },
  // IT조선
  {
    name: 'IT조선',
    nameEn: 'it_chosun',
    url: 'https://news.google.com/rss/search?q=site%3Ait.chosun.com&hl=ko&gl=KR&ceid=KR:ko',
    category: 'it',
    subcategory: 'korean_it',
    language: 'ko',
    icon: '📰',
    fetchInterval: 1,
    type: 'rss',
  },
  // 전자신문
  {
    name: '전자신문',
    nameEn: 'etnews',
    url: 'https://rss.etnews.com/Section901.xml',
    category: 'it',
    subcategory: 'korean_it',
    language: 'ko',
    icon: '⚡',
    fetchInterval: 1,
    type: 'rss',
  },
  // 디지털데일리
  {
    name: '디지털데일리',
    nameEn: 'digitaldaily',
    url: 'https://www.ddaily.co.kr/rss/all.xml',
    category: 'it',
    subcategory: 'korean_it',
    language: 'ko',
    icon: '📱',
    fetchInterval: 1,
    type: 'rss',
  },
];

// =============================================
// IT News Sources - Global
// =============================================

export const IT_GLOBAL_SOURCES: AIITSourceConfig[] = [
  // TechCrunch
  {
    name: 'TechCrunch',
    nameEn: 'techcrunch',
    url: 'https://techcrunch.com/feed/',
    category: 'it',
    subcategory: 'global_it',
    language: 'en',
    icon: '🚀',
    fetchInterval: 1,
    type: 'rss',
  },
  // The Verge
  {
    name: 'The Verge',
    nameEn: 'theverge',
    url: 'https://www.theverge.com/rss/index.xml',
    category: 'it',
    subcategory: 'global_it',
    language: 'en',
    icon: '📱',
    fetchInterval: 1,
    type: 'rss',
  },
  // Ars Technica
  {
    name: 'Ars Technica',
    nameEn: 'arstechnica',
    url: 'https://feeds.arstechnica.com/arstechnica/index',
    category: 'it',
    subcategory: 'global_it',
    language: 'en',
    icon: '🔬',
    fetchInterval: 1,
    type: 'rss',
  },
  // Engadget
  {
    name: 'Engadget',
    nameEn: 'engadget',
    url: 'https://www.engadget.com/rss.xml',
    category: 'it',
    subcategory: 'global_it',
    language: 'en',
    icon: '🎮',
    fetchInterval: 1,
    type: 'rss',
  },
  // Wired
  {
    name: 'Wired',
    nameEn: 'wired',
    url: 'https://www.wired.com/feed/rss',
    category: 'it',
    subcategory: 'global_it',
    language: 'en',
    icon: '🔗',
    fetchInterval: 1,
    type: 'rss',
  },
  // Hacker News
  {
    name: 'Hacker News',
    nameEn: 'hackernews',
    url: 'https://hnrss.org/frontpage',
    category: 'it',
    subcategory: 'global_it',
    language: 'en',
    icon: '🧡',
    fetchInterval: 1,
    type: 'rss',
  },
  // Dev.to
  {
    name: 'Dev.to',
    nameEn: 'devto',
    url: 'https://dev.to/feed',
    category: 'it',
    subcategory: 'dev',
    language: 'en',
    icon: '💻',
    fetchInterval: 1,
    type: 'rss',
  },
  // GitHub Trending (JS-rendered, no RSS)
  {
    name: 'GitHub Trending',
    nameEn: 'github_trending',
    url: 'https://github.com/trending',
    category: 'it',
    subcategory: 'dev',
    language: 'en',
    icon: '⭐',
    fetchInterval: 1,
    type: 'crawler',
    crawlerConfig: {
      selector: 'article[class*="Box-row"]',
      titleSelector: 'h2',
      linkSelector: 'a',
      descriptionSelector: 'p',
      pagination: { type: 'page', maxPages: 1 },
    },
  },
  // Stack Overflow questions (JS-rendered trending)
  {
    name: 'Stack Overflow',
    nameEn: 'stackoverflow',
    url: 'https://stackoverflow.com/questions?tab=trending',
    category: 'it',
    subcategory: 'dev',
    language: 'en',
    icon: '📚',
    fetchInterval: 2,
    type: 'crawler',
    crawlerConfig: {
      selector: 'div[class*="question-summary"]',
      titleSelector: 'h3',
      linkSelector: 'a[class*="question-hyperlink"]',
      descriptionSelector: '[class*="excerpt"]',
      pagination: { type: 'page', maxPages: 1 },
    },
  },
];

// =============================================
// All Sources Combined
// =============================================

export const ALL_AI_SOURCES: AIITSourceConfig[] = [
  ...AI_OFFICIAL_SOURCES,
  ...AI_TECH_SOURCES,
];

export const ALL_IT_SOURCES: AIITSourceConfig[] = [
  ...IT_KOREAN_SOURCES,
  ...IT_GLOBAL_SOURCES,
];

export const ALL_AIIT_SOURCES: AIITSourceConfig[] = [
  ...ALL_AI_SOURCES,
  ...ALL_IT_SOURCES,
];

// =============================================
// Category Labels
// =============================================

export const AI_SUBCATEGORY_LABELS: Record<string, string> = {
  // Official
  openai: 'OpenAI',
  anthropic: 'Anthropic (Claude)',
  google_ai: 'Google AI',
  deepmind: 'Google DeepMind',
  microsoft_ai: 'Microsoft AI',
  meta_ai: 'Meta AI',
  nvidia: 'NVIDIA',
  huggingface: 'Hugging Face',
  // Technology
  ai_industry: 'AI 산업',
  ai_startups: 'AI 스타트업',
  ai_research: 'AI 연구',
  llm: 'LLM (대형 언어 모델)',
  ai_agents: 'AI 에이전트',
  robotics: '로보틱스',
};

export const IT_SUBCATEGORY_LABELS: Record<string, string> = {
  korean_it: '국내 IT',
  global_it: '글로벌 IT',
  dev: '개발자 소식',
};

export const CATEGORY_LABELS_AIIT: Record<string, string> = {
  ai: 'AI News',
  it: 'IT News',
};

// =============================================
// Helper Functions
// =============================================

export function getAISources(): AIITSourceConfig[] {
  return ALL_AI_SOURCES;
}

export function getITSources(): AIITSourceConfig[] {
  return ALL_IT_SOURCES;
}

export function getSourcesByCategory(category: 'ai' | 'it'): AIITSourceConfig[] {
  return category === 'ai' ? ALL_AI_SOURCES : ALL_IT_SOURCES;
}

export function getSourcesBySubcategory(subcategory: string): AIITSourceConfig[] {
  return ALL_AIIT_SOURCES.filter((s) => s.subcategory === subcategory);
}

export function getSourceByNameEn(nameEn: string): AIITSourceConfig | undefined {
  return ALL_AIIT_SOURCES.find((s) => s.nameEn === nameEn);
}

export function getAISubcategories(): string[] {
  return [...new Set(ALL_AI_SOURCES.map((s) => s.subcategory))];
}

export function getITSubcategories(): string[] {
  return [...new Set(ALL_IT_SOURCES.map((s) => s.subcategory))];
}