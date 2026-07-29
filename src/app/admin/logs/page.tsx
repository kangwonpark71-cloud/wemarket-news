'use client';

import { useState, useEffect, useCallback } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('AdminLogsPage')

interface LogEntry {
  id: string;
  type: 'fetch' | 'financial';
  service: string;
  sourceName: string;
  status: string;
  count: number | null;
  newCount: number | null;
  error: string | null;
  duration: number | null;
  timestamp: string;
}

interface LogsData {
  logs: LogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

const STATUS_COLORS: Record<string, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  partial: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-rose-50 text-rose-700 border-rose-200',
};

const TYPE_LABELS: Record<string, string> = {
  fetch: '📰 RSS/AI/IT',
  financial: '💹 금융',
};

export default function AdminLogsPage() {
  const [data, setData] = useState<LogsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type !== 'all') params.set('type', type);
      if (status) params.set('status', status);
      params.set('page', String(page));
      params.set('limit', '30');

      const res = await fetch(`/api/admin/logs?${params}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      log.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  }, [type, status, page]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  const handleFilterChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  return (
    <div>
      
      <div className="bg-white rounded-none shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">로그 유형</label>
            <select
              value={type}
              onChange={(e) => handleFilterChange(setType, e.target.value)}
              className="h-9 rounded-sm border border-slate-300 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">전체</option>
              <option value="fetch">수집 로그</option>
              <option value="financial">금융 데이터</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">상태</label>
            <select
              value={status}
              onChange={(e) => handleFilterChange(setStatus, e.target.value)}
              className="h-9 rounded-sm border border-slate-300 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">전체</option>
              <option value="success">성공</option>
              <option value="partial">부분 성공</option>
              <option value="error">오류</option>
            </select>
          </div>
          <div className="flex items-end gap-2 ml-auto">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span className="text-xs font-semibold text-slate-500">자동 새로고침 (15초)</span>
            </label>
            <button
              onClick={fetchLogs}
              className="h-9 px-4 border border-slate-300 hover:bg-slate-100 text-xs font-semibold rounded-sm transition-colors cursor-pointer"
            >
              🔄 새로고침
            </button>
          </div>
        </div>
      </div>

      
      <div className="bg-white rounded-none shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm animate-pulse">로딩 중...</div>
        ) : !data || data.logs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">로그가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/50 text-slate-600 font-semibold text-xs border-b border-slate-200">
                  <th className="py-4 px-4">시간</th>
                  <th className="py-4 px-4">유형</th>
                  <th className="py-4 px-4">서비스</th>
                  <th className="py-4 px-4">소스/엔드포인트</th>
                  <th className="py-4 px-4 text-center">상태</th>
                  <th className="py-4 px-4 text-right">수집</th>
                  <th className="py-4 px-4 text-right">소요시간</th>
                  <th className="py-4 px-4">오류</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 text-xs">
                    <td className="py-3 px-4 text-slate-500 tabular-nums whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('ko-KR')}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs">{TYPE_LABELS[log.type] || log.type}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{log.service}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-[200px] truncate" title={log.sourceName}>
                      {log.sourceName}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-sm font-bold text-[10px] border ${STATUS_COLORS[log.status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        {log.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-slate-600">
                      {log.count != null ? `${log.count}건` : '-'}
                      {log.newCount != null && log.newCount > 0 && (
                        <span className="text-emerald-600 font-bold ml-1">(+{log.newCount})</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-slate-500">
                      {log.duration != null ? `${log.duration.toLocaleString()}ms` : '-'}
                    </td>
                    <td className="py-3 px-4 text-rose-600 max-w-[200px] truncate" title={log.error || ''}>
                      {log.error || <span className="text-slate-300">-</span>}
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
          <span className="text-xs text-slate-500">
            {page} / {data.totalPages}
          </span>
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
