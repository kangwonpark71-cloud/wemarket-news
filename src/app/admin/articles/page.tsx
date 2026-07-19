'use client';

import { useState, useEffect, useCallback } from 'react';

interface ArticleEntry {
  id: string;
  title: string;
  url: string;
  category: string | null;
  sourceType: string;
  language: string;
  isRead: boolean;
  isBookmarked: boolean;
  publishedAt: string;
  fetchedAt: string;
  source: { id: string; name: string; nameEn: string } | null;
}

interface SourceOption {
  id: string;
  name: string;
  nameEn: string;
  sourceType: string;
}

interface ArticlesData {
  articles: ArticleEntry[];
  total: number;
  page: number;
  totalPages: number;
  sources: SourceOption[];
}

export default function AdminArticlesPage() {
  const [data, setData] = useState<ArticlesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [category, setCategory] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (sourceId) params.set('sourceId', sourceId);
      if (category) params.set('category', category);
      if (sourceType) params.set('sourceType', sourceType);
      if (status) params.set('status', status);
      params.set('page', String(page));
      params.set('limit', '20');

      const res = await fetch(`/api/admin/articles?${params}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error('Failed to load articles:', err);
    } finally {
      setLoading(false);
    }
  }, [search, sourceId, category, sourceType, status, page]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchArticles();
  };

  const handleDelete = async (articleId: string, title: string) => {
    if (!window.confirm(`정말 "${title.slice(0, 40)}..." 기사를 삭제하시겠습니까?`)) return;
    setDeleting(articleId);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/articles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage(`✅ 기사가 삭제되었습니다.`);
        fetchArticles();
      } else {
        setMessage(`❌ ${json.error || '삭제 실패'}`);
      }
    } catch (err) {
      setMessage(`❌ 통신 오류: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDeleting(null);
    }
  };

  const categories = data?.sources
    ? [...new Set(data.sources.map((s) => s.sourceType))]
    : [];

  return (
    <div>
      
      <div className="bg-white rounded-none shadow-sm border border-slate-200 p-4 mb-6">
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-slate-500 mb-1">검색</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="제목 또는 내용 검색..."
              className="h-9 w-full rounded-sm border border-slate-300 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">소스</label>
            <select
              value={sourceId}
              onChange={(e) => { setSourceId(e.target.value); setPage(1); }}
              className="h-9 rounded-sm border border-slate-300 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">전체</option>
              {data?.sources.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">유형</label>
            <select
              value={sourceType}
              onChange={(e) => { setSourceType(e.target.value); setPage(1); }}
              className="h-9 rounded-sm border border-slate-300 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">전체</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">상태</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="h-9 rounded-sm border border-slate-300 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">전체</option>
              <option value="read">읽음</option>
              <option value="unread">읽지 않음</option>
              <option value="bookmarked">북마크</option>
            </select>
          </div>
          <button
            type="submit"
            className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-sm transition-colors cursor-pointer"
          >
            검색
          </button>
          <button
            type="button"
            onClick={() => { setSearch(''); setSourceId(''); setCategory(''); setSourceType(''); setStatus(''); setPage(1); }}
            className="h-9 px-4 border border-slate-300 hover:bg-slate-100 text-xs font-semibold rounded-sm transition-colors cursor-pointer"
          >
            초기화
          </button>
        </form>
      </div>

      {message && (
        <div className="mb-4 px-4 py-3 bg-white border border-slate-200 text-sm font-medium rounded-sm shadow-sm">
          {message}
        </div>
      )}

      
      {data && (
        <div className="text-xs text-slate-500 mb-3">
          총 {data.total.toLocaleString()}개 기사 ({(data.page - 1) * 20 + 1}–{Math.min(data.page * 20, data.total)})
        </div>
      )}

      
      <div className="bg-white rounded-none shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm animate-pulse">로딩 중...</div>
        ) : !data || data.articles.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">검색 결과가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/50 text-slate-600 font-semibold text-xs border-b border-slate-200">
                  <th className="py-4 px-4">제목</th>
                  <th className="py-4 px-4">소스</th>
                  <th className="py-4 px-4">유형</th>
                  <th className="py-4 px-4">카테고리</th>
                  <th className="py-4 px-4 text-center">상태</th>
                  <th className="py-4 px-4">발행일</th>
                  <th className="py-4 px-4 text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.articles.map((article) => (
                  <tr key={article.id} className="hover:bg-slate-50 text-sm">
                    <td className="py-4 px-4 max-w-md">
                      <div className="font-semibold text-slate-900 truncate" title={article.title}>
                        {article.title}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{article.language === 'ko' ? '🇰🇷' : '🇺🇸'} {article.language}</div>
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-600">{article.source?.name || '-'}</td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold border ${
                        article.sourceType === 'RSS' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-blue-50 text-blue-600 border-blue-200'
                      }`}>
                        {article.sourceType}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-500">{article.category || '-'}</td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-xs">
                        {article.isRead ? '📖' : '📄'} {article.isBookmarked ? '⭐' : ''}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-500 tabular-nums">
                      {new Date(article.publishedAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded-sm text-[10px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                          열기
                        </a>
                        <button
                          onClick={() => handleDelete(article.id, article.title)}
                          disabled={deleting === article.id}
                          className="px-2 py-1 rounded-sm text-[10px] font-semibold bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {deleting === article.id ? '...' : '삭제'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 border border-slate-300 text-xs font-semibold rounded-sm hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            ← 이전
          </button>
          {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
            const start = Math.max(1, Math.min(page - 2, data.totalPages - 4));
            const n = start + i;
            if (n > data.totalPages) return null;
            return (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm border cursor-pointer ${
                  page === n
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-slate-300 hover:bg-slate-100'
                }`}
              >
                {n}
              </button>
            );
          })}
          <button
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page >= data.totalPages}
            className="px-3 py-1.5 border border-slate-300 text-xs font-semibold rounded-sm hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            다음 →
          </button>
        </div>
      )}
    </div>
  );
}
