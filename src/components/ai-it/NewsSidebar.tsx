'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NewsSidebarProps {
  category: 'ai' | 'it';
  subcategories: { subcategory: string; count: number }[];
}

const AI_SUBCATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  openai: { label: 'OpenAI', icon: '🤖' },
  anthropic: { label: 'Anthropic (Claude)', icon: '🧠' },
  google_ai: { label: 'Google AI', icon: '🌈' },
  deepmind: { label: 'Google DeepMind', icon: '🧬' },
  microsoft_ai: { label: 'Microsoft AI', icon: '🪟' },
  meta_ai: { label: 'Meta AI', icon: '📘' },
  nvidia: { label: 'NVIDIA', icon: '🟢' },
  huggingface: { label: 'Hugging Face', icon: '🤗' },
  ai_industry: { label: 'AI 산업', icon: '📰' },
  ai_startups: { label: 'AI 스타트업', icon: '🚀' },
  ai_research: { label: 'AI 연구', icon: '🔬' },
  llm: { label: 'LLM', icon: '📄' },
  ai_agents: { label: 'AI 에이전트', icon: '🤖' },
  robotics: { label: '로보틱스', icon: '🦾' },
};

const IT_SUBCATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  korean_it: { label: '국내 IT', icon: '🇰🇷' },
  global_it: { label: '글로벌 IT', icon: '🌍' },
  dev: { label: '개발자 소식', icon: '💻' },
};

export default function NewsSidebar({ category, subcategories }: NewsSidebarProps) {
  const searchParams = useSearchParams();

  const labels = category === 'ai' ? AI_SUBCATEGORY_LABELS : IT_SUBCATEGORY_LABELS;
  const currentSubcategory = searchParams.get('subcategory');

  const filteredSubcategories = subcategories.filter(sc => {
    const label = labels[sc.subcategory];
    return label;
  });

  return (
    <aside className="hidden w-64 shrink-0 lg:block" aria-label={`${category.toUpperCase()} 뉴스 카테고리`}>
      <div className="sticky top-24 space-y-6">
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {category === 'ai' ? '공식 AI' : 'IT 카테고리'}
          </h3>
          <nav className="space-y-1" aria-label={`${category === 'ai' ? '공식 AI' : 'IT'} 소스 목록`}>
            {filteredSubcategories.map(({ subcategory, count }) => {
              const info = labels[subcategory];
              if (!info) return null;
              
              const isCurrent = currentSubcategory === subcategory;
              return (
                <Link
                  key={subcategory}
                  href={`/${category}-news?subcategory=${subcategory}`}
                  className={cn(
                    'flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors',
                    isCurrent
                      ? 'bg-primary-light text-primary'
                      : 'text-foreground hover:bg-muted'
                  )}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  <span aria-hidden="true">{info.icon}</span>
                  <span className="truncate">{info.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{count}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="rounded-sm border border-border bg-muted p-4">
          <h4 className="mb-2 text-sm font-medium text-foreground">필터 옵션</h4>
          <div className="space-y-2">
            <Link
              href={`/${category}-news`}
              className={cn(
                'flex items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium transition-colors',
                !currentSubcategory
                  ? 'bg-primary-light text-primary'
                  : 'text-foreground hover:bg-muted'
              )}
            >
              <span>전체 보기</span>
            </Link>
            <Link
              href={`/${category}-news?language=ko`}
              className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <span>🇰🇷</span>
              <span>한국어</span>
            </Link>
            <Link
              href={`/${category}-news?language=en`}
              className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <span>🇺🇸</span>
              <span>English</span>
            </Link>
          </div>
        </div>

        <div className="rounded-sm border border-border bg-muted p-4">
          <h4 className="mb-2 text-sm font-medium text-foreground">시간 필터</h4>
          <div className="space-y-1">
            <Link
              href={`/${category}-news?period=1h`}
              className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <span>⏱</span>
              <span>최근 1시간</span>
            </Link>
            <Link
              href={`/${category}-news?period=24h`}
              className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <span>📅</span>
              <span>오늘</span>
            </Link>
            <Link
              href={`/${category}-news?period=7d`}
              className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <span>📆</span>
              <span>이번 주</span>
            </Link>
          </div>
        </div>

        <div className="rounded-sm border border-border bg-muted p-4">
          <h4 className="mb-2 text-sm font-medium text-foreground">자동 업데이트</h4>
          <p className="text-xs text-muted-foreground">
            {category === 'ai' 
              ? '공식 블로그: 15분마다\n기술 뉴스: 60분마다' 
              : '국내 IT: 15분마다\n글로벌 IT: 30분마다'}
          </p>
        </div>
      </div>
    </aside>
  );
}