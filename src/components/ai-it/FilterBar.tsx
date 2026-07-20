'use client';

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  category?: string;
  sources: { id: string; name: string; nameEn: string; icon?: string }[];
  tags: { name: string; count: number }[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export default function FilterBar({ sources, tags, totalCount, currentPage, totalPages }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showTags, setShowTags] = useState(false);

  const currentSource = searchParams.get('source');
  const currentLanguage = searchParams.get('language');
  const currentSort = searchParams.get('sortBy') || 'publishedAt';
  const currentOrder = searchParams.get('sortOrder') || 'desc';
  const currentTags = searchParams.get('tags')?.split(',').filter(Boolean) || [];

  const updateParams = (params: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value) newParams.set(key, value);
      else newParams.delete(key);
    });
    router.push(`${pathname}?${newParams.toString()}`);
  };

  const handleSourceChange = (sourceId: string | null) => {
    updateParams({ source: sourceId, page: '1' });
  };

  const handleLanguageChange = (lang: string | null) => {
    updateParams({ language: lang, page: '1' });
  };

  const handleSortChange = (sortBy: string) => {
    if (currentSort === sortBy) {
      updateParams({ sortOrder: currentOrder === 'desc' ? 'asc' : 'desc' });
    } else {
      updateParams({ sortBy, sortOrder: 'desc', page: '1' });
    }
  };

  const handleTagToggle = (tag: string) => {
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    updateParams({ tags: newTags.join(',') || null, page: '1' });
  };

  const clearFilters = () => {
    updateParams({ source: null, language: null, tags: null, page: '1' });
  };

  const hasActiveFilters = currentSource || currentLanguage || currentTags.length > 0;

  return (
    <div className="sticky top-16 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-6 lg:py-2">
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-foreground">
            총 {totalCount.toLocaleString()}개 기사
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              필터 초기화
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select
              value={currentSource || ''}
              onChange={e => handleSourceChange(e.target.value || null)}
              className="h-9 rounded-sm border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">전체 소스</option>
              {sources.map(source => (
                <option key={source.id} value={source.nameEn}>
                  {source.icon ? `${source.icon} ` : ''}{source.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <select
              value={currentLanguage || ''}
              onChange={e => handleLanguageChange(e.target.value || null)}
              className="h-9 rounded-sm border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">전체 언어</option>
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="relative">
            <select
              value={currentSort}
              onChange={e => handleSortChange(e.target.value)}
              className="h-9 rounded-sm border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="publishedAt">최신순</option>
              <option value="fetchedAt">수집순</option>
              <option value="title">제목순</option>
            </select>
            <button
              onClick={() => handleSortChange(currentSort)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={currentOrder === 'desc' ? '내림차순' : '오름차순'}
            >
              {currentOrder === 'desc' ? '↓' : '↑'}
            </button>
          </div>

          <button
            onClick={() => setShowTags(!showTags)}
            className={cn(
              'h-9 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors',
              showTags
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground hover:bg-muted/80'
            )}
          >
            태그 필터 {currentTags.length > 0 && `(${currentTags.length})`}
          </button>
        </div>
      </div>

{showTags && (
        <div className="border-t border-border px-4 py-3 sm:px-6">
          <div className="flex flex-wrap gap-2">
            {tags.slice(0, 20).map(({ name, count }) => (
              <button
                key={name}
                onClick={() => handleTagToggle(name)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  currentTags.includes(name)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                )}
              >
                {name} <span className="opacity-70">({count})</span>
              </button>
            ))}
            {tags.length > 20 && (
              <span className="px-3 py-1 text-xs text-muted-foreground">
                외 {tags.length - 20}개
              </span>
            )}
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="border-t border-border px-4 py-3 sm:px-6">
          <nav className="flex items-center justify-center gap-1" aria-label="페이지네이션">
            {currentPage > 1 && (
              <button
                onClick={() => updateParams({ page: String(currentPage - 1) })}
                className="h-9 w-9 rounded-sm border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
                aria-label="이전 페이지"
              >
                ←
              </button>
            )}
            <span className="px-3 text-sm text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            {currentPage < totalPages && (
              <button
                onClick={() => updateParams({ page: String(currentPage + 1) })}
                className="h-9 w-9 rounded-sm border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
                aria-label="다음 페이지"
              >
                →
              </button>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}