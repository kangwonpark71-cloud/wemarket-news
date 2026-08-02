'use client';

import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
interface NewsCardProps {
  article: {
    id: string;
    title: string;
    url: string;
    description?: string | null;
    thumbnail?: string | null;
    publishedAt: Date | string;
    publishedDate?: string;
    language: string;
    isBookmarked?: boolean;
    source: {
      name: string;
      nameEn: string;
      icon?: string | null;
    };
    summary?: {
      translatedTitle?: string | null;
      summary3Line: string;
      keywords: string[];
      relatedCompanies: string[];
      relatedModels: string[];
      difficulty: string;
    } | null;
    tags?: { tag: { name: string } }[];
  };
  variant?: 'default' | 'compact' | 'featured';
}

function formatDate(date: Date | string, language: string) {
  const d = new Date(date);
  const locale = language === 'ko' ? ko : enUS;
  return formatDistanceToNow(d, { addSuffix: true, locale });
}

export default function NewsCard({ article, variant = 'default' }: NewsCardProps) {
  const publishedDate = article.publishedDate ?? formatDate(new Date(article.publishedAt), article.language);
  const summary = article.summary;
  const tags = article.tags?.map(t => t.tag.name).slice(0, 5) || [];
  const keywords = summary?.keywords.slice(0, 5) || [];

  if (variant === 'compact') {
    return (
      <article className="flex gap-3 py-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
        {article.thumbnail && (
          <Link href={`/ai-it/articles/${article.id}`} className="flex-shrink-0 w-20 h-20 rounded-sm overflow-hidden relative" aria-label={article.title}>
            <Image src={article.thumbnail} alt="" fill className="object-cover" sizes="80px" />
          </Link>
        )}
        <div className="flex-1 min-w-0">
          <Link href={`/ai-it/articles/${article.id}`} className="font-medium text-foreground hover:text-primary line-clamp-2 word-break-keep-all" title={article.title}>
            {article.language === 'en' && summary?.translatedTitle ? (
              <span className="flex flex-col gap-0.5">
                <span className="text-primary font-bold">{summary.translatedTitle}</span>
                <span className="text-xs text-muted-foreground font-normal">{article.title}</span>
              </span>
            ) : article.title}
          </Link>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              {article.source.icon && <span>{article.source.icon}</span>}
              {article.source.name}
            </span>
            <span>{publishedDate}</span>
            {article.isBookmarked && <span className="text-yellow-500">★</span>}
          </div>
        </div>
      </article>
    );
  }

  if (variant === 'featured') {
    return (
      <article className="group relative rounded-sm border border-border bg-card overflow-hidden transition-colors duration-200 hover:shadow-sm">
        {article.thumbnail && (
          <Link href={`/ai-it/articles/${article.id}`} className="relative aspect-video overflow-hidden" aria-label={article.title}>
            <Image src={article.thumbnail} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 768px) 100vw, 50vw" />
          </Link>
        )}
        <div className="p-4">
          <div className="mb-2 flex flex-wrap gap-1">
            {article.source.icon && <span className="text-lg">{article.source.icon}</span>}
            <span className="text-xs font-medium text-muted-foreground">{article.source.name}</span>
            <span className="text-xs text-muted-foreground">{publishedDate}</span>
          </div>
          <Link href={`/ai-it/articles/${article.id}`}>
            <h3 className="line-clamp-2 word-break-keep-all font-semibold text-foreground hover:text-primary transition-colors" title={article.title}>
              {article.language === 'en' && summary?.translatedTitle ? (
                <span className="flex flex-col gap-0.5">
                  <span className="text-primary font-bold">{summary.translatedTitle}</span>
                  <span className="text-sm text-muted-foreground font-normal">{article.title}</span>
                </span>
              ) : article.title}
            </h3>
          </Link>
          {summary && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{summary.summary3Line}</p>
          )}
          {(tags.length > 0 || keywords.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-1">
              {tags.slice(0, 3).map(tag => (
                <span key={tag} className="rounded px-2 py-0.5 text-xs bg-muted text-muted-foreground">
                  {tag}
                </span>
              ))}
              {keywords.slice(0, 3).map(keyword => (
                <span key={keyword} className="rounded px-2 py-0.5 text-xs bg-primary/10 text-primary">
                  {keyword}
                </span>
              ))}
            </div>
          )}
        </div>
      </article>
    );
  }

  return (
    <article className="rounded-sm border border-border bg-card p-4 transition-colors duration-200 hover:shadow-sm">
      <div className="flex gap-4">
        {article.thumbnail && (
          <Link href={`/ai-it/articles/${article.id}`} className="flex-shrink-0 w-32 h-32 rounded-sm overflow-hidden relative" aria-label={article.title}>
            <Image src={article.thumbnail} alt="" fill className="object-cover" sizes="128px" />
          </Link>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            {article.source.icon && <span className="text-base">{article.source.icon}</span>}
            <span className="font-medium">{article.source.name}</span>
            <span className="text-muted-foreground/50">·</span>
            <time dateTime={new Date(article.publishedAt).toISOString()}>{publishedDate}</time>
            {article.isBookmarked && <span className="text-yellow-500" title="북마크됨">★</span>}
          </div>
          <Link href={`/ai-it/articles/${article.id}`}>
            <h3 className="line-clamp-2 word-break-keep-all font-semibold text-foreground hover:text-primary transition-colors mb-2" title={article.title}>
              {article.language === 'en' && summary?.translatedTitle ? (
                <span className="flex flex-col gap-1">
                  <span className="text-primary font-bold text-base">{summary.translatedTitle}</span>
                  <span className="text-xs text-muted-foreground font-normal block">{article.title}</span>
                </span>
              ) : article.title}
            </h3>
          </Link>
          {summary?.summary3Line && (
            <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{summary.summary3Line}</p>
          )}
          {(tags.length > 0 || keywords.length > 0) && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 4).map(tag => (
                <span key={tag} className="rounded px-2 py-0.5 text-xs bg-muted text-muted-foreground">
                  {tag}
                </span>
              ))}
              {keywords.slice(0, 3).map(keyword => (
                <span key={keyword} className="rounded px-2 py-0.5 text-xs bg-primary/10 text-primary">
                  {keyword}
                </span>
              ))}
              {summary?.relatedCompanies.slice(0, 2).map(company => (
                <span key={company} className="rounded px-2 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  {company}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}