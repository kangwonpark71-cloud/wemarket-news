'use client';

import { useState, useEffect, useCallback } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('AdminErrorLogsPage');

interface ErrorLogEntry {
  id: string;
  level: 'error' | 'warn' | 'info';
  source: string;
  message: string;
  stack: string | null;
  context: string | null;
  createdAt: string;
}

interface ErrorSummary {
  total: number;
  last24h: number;
  byLevel: Record<string, number>;
  bySource: { source: string; count: number }[];
}

const LEVEL_STYLES: Record<string, string> = {
  error: 'bg-red-100 text-red-700',
  warn: 'bg-amber-100 text-amber-700',
  info: 'bg-blue-100 text-blue-700',
};

export default function AdminErrorLogsPage() {
  const [logs, setLogs] = useState<ErrorLogEntry[]>([]);
  const [summary, setSummary] = useState<ErrorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '50', summary: 'true' });
      if (levelFilter) params.set('level', levelFilter);
      if (sourceFilter) params.set('source', sourceFilter);
      const res = await fetch(`/api/admin/error-logs?${params}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data.items);
        setSummary(json.summary);
      }
    } catch (err) {
      log.error('Failed to fetch error logs:', err);
    } finally {
      setLoading(false);
    }
  }, [levelFilter, sourceFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(fetchLogs, 15000);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchLogs]);

  const handleClear = async () => {
    if (!confirm('모든 에러 로그를 삭제하시겠습니까?')) return;
    const params = new URLSearchParams();
    if (levelFilter) params.set('level', levelFilter);
    await fetch(`/api/admin/error-logs?${params}`, { method: 'DELETE' });
    fetchLogs();
  };

  const parseContext = (raw: string | null): unknown => {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">🛰️ 에러 모니터링</h1>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="accent-indigo-600"
            />
            자동 새로고침
          </label>
          <button
            onClick={handleClear}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-sm transition-colors cursor-pointer"
          >
            로그 삭제
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white border border-slate-200 rounded-sm p-4">
            <div className="text-2xl font-bold text-slate-900">{summary.total}</div>
            <div className="text-xs text-slate-500 mt-1">전체 에러</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-sm p-4">
            <div className="text-2xl font-bold text-amber-600">{summary.last24h}</div>
            <div className="text-xs text-slate-500 mt-1">최근 24시간</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-sm p-4">
            <div className="text-2xl font-bold text-red-600">{summary.byLevel.error ?? 0}</div>
            <div className="text-xs text-slate-500 mt-1">Error</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-sm p-4">
            <div className="text-2xl font-bold text-amber-600">{summary.byLevel.warn ?? 0}</div>
            <div className="text-xs text-slate-500 mt-1">Warn</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-sm p-4">
            <div className="text-2xl font-bold text-blue-600">{summary.byLevel.info ?? 0}</div>
            <div className="text-xs text-slate-500 mt-1">Info</div>
          </div>
        </div>
      )}

      {summary && summary.bySource.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-sm p-4">
          <h2 className="text-xs font-bold text-slate-700 mb-3">📡 소스별 에러 발생</h2>
          <div className="flex flex-wrap gap-2">
            {summary.bySource.map((s) => (
              <button
                key={s.source}
                onClick={() => setSourceFilter(sourceFilter === s.source ? '' : s.source)}
                className={`px-2.5 py-1 rounded-sm text-xs font-medium transition-colors cursor-pointer ${
                  sourceFilter === s.source
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s.source} <span className="opacity-70">({s.count})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="flex rounded-sm border border-slate-200 overflow-hidden">
          {['', 'error', 'warn', 'info'].map((lv) => (
            <button
              key={lv || 'all'}
              onClick={() => setLevelFilter(lv)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                levelFilter === lv ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {lv ? (lv === 'error' ? '🔴 Error' : lv === 'warn' ? '🟡 Warn' : '🔵 Info') : '전체'}
            </button>
          ))}
        </div>
        {sourceFilter && (
          <button
            onClick={() => setSourceFilter('')}
            className="text-xs text-indigo-600 hover:text-indigo-800 cursor-pointer"
          >
            ✕ {sourceFilter} 필터 해제
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-slate-500 py-8 text-center">로딩 중...</div>
      ) : logs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-sm p-8 text-center text-sm text-slate-500">
          🎉 에러 로그가 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((entry) => (
            <div key={entry.id} className="bg-white border border-slate-200 rounded-sm overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <span className={`mt-0.5 px-2 py-0.5 rounded-sm text-[10px] font-bold ${LEVEL_STYLES[entry.level]}`}>
                  {entry.level.toUpperCase()}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-semibold text-slate-700 truncate">{entry.message}</span>
                  <span className="block text-[11px] text-slate-400 mt-0.5">{entry.source}</span>
                </span>
                <span className="text-[11px] text-slate-400 whitespace-nowrap">
                  {new Date(entry.createdAt).toLocaleString('ko-KR')}
                </span>
              </button>
              {expandedId === entry.id && (
                <div className="px-4 pb-4 space-y-2 border-t border-slate-100 pt-3">
                  {entry.stack && (
                    <pre className="text-[11px] text-slate-600 bg-slate-50 rounded-sm p-3 overflow-x-auto whitespace-pre-wrap break-all">
                      {entry.stack}
                    </pre>
                  )}
                  {entry.context && (
                    <pre className="text-[11px] text-slate-600 bg-indigo-50/50 rounded-sm p-3 overflow-x-auto whitespace-pre-wrap break-all">
                      {JSON.stringify(parseContext(entry.context), null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
