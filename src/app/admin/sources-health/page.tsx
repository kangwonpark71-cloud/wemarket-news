'use client';

import { useState, useEffect, useMemo } from 'react';

interface FetchLog {
  id: string;
  sourceId: string;
  status: 'success' | 'error' | 'partial';
  count: number;
  newCount: number;
  error: string | null;
  duration: number | null;
  fetchedAt: string;
  source: { name: string; nameEn: string; category: string };
}

interface SourceStat {
  name: string;
  category: string;
  runs: number;
  success: number;
  partial: number;
  error: number;
  successRate: number;
  avgDuration: number;
  totalArticles: number;
  newArticles: number;
  lastRun: string | null;
  lastStatus: string | null;
}

type SortKey = 'successRate' | 'runs' | 'avgDuration' | 'newArticles' | 'lastRun';

export default function AdminSourcesHealthPage() {
  const [logs, setLogs] = useState<FetchLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('successRate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetch('/api/fetch-logs?limit=500')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setLogs(json.data.logs as FetchLog[]);
        else setError(json.error || 'Failed to load fetch logs');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo<SourceStat[]>(() => {
    const byName = new Map<string, SourceStat>();
    for (const log of logs) {
      const name = log.source?.name || log.sourceId;
      let s = byName.get(name);
      if (!s) {
        s = {
          name,
          category: log.source?.category || '',
          runs: 0,
          success: 0,
          partial: 0,
          error: 0,
          successRate: 0,
          avgDuration: 0,
          totalArticles: 0,
          newArticles: 0,
          lastRun: null,
          lastStatus: null,
        };
        byName.set(name, s);
      }
      s.runs += 1;
      if (log.status === 'success') s.success += 1;
      else if (log.status === 'partial') s.partial += 1;
      else s.error += 1;
      s.totalArticles += log.count || 0;
      s.newArticles += log.newCount || 0;
      if (typeof log.duration === 'number') s.avgDuration += log.duration;
      if (!s.lastRun || log.fetchedAt > s.lastRun) {
        s.lastRun = log.fetchedAt;
        s.lastStatus = log.status;
      }
    }

    const result = Array.from(byName.values());
    for (const s of result) {
      s.successRate = s.runs ? Math.round(((s.success + s.partial * 0.5) / s.runs) * 100) : 0;
      s.avgDuration = s.runs ? Math.round(s.avgDuration / s.runs) : 0;
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'lastRun') {
        cmp = (a.lastRun || '').localeCompare(b.lastRun || '');
      } else {
        cmp = (a[sortKey] as number) - (b[sortKey] as number);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [logs, sortKey, sortDir]);

  const totals = useMemo(() => {
    const runs = stats.reduce((a, s) => a + s.runs, 0);
    const errors = stats.reduce((a, s) => a + s.error, 0);
    const newArticles = stats.reduce((a, s) => a + s.newArticles, 0);
    const avgRate = runs ? Math.round(stats.reduce((a, s) => a + s.successRate, 0) / stats.length) : 0;
    return { runs, errors, newArticles, avgRate, sources: stats.length };
  }, [stats]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-600">
        <div className="text-lg font-semibold animate-pulse">📡 수집 성과 분석 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-rose-600 font-semibold">❌ {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900">📡 수집 성과 대시보드</h1>
        <p className="text-xs text-slate-500 mt-1">
          최근 수집 로그({logs.length}건)를 기준으로 소스별 수집 안정성과 처리량을 집계합니다.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="모니터링 소스" value={totals.sources.toLocaleString()} />
        <SummaryCard label="총 수집 실행" value={totals.runs.toLocaleString()} />
        <SummaryCard label="신규 기사" value={totals.newArticles.toLocaleString()} />
        <SummaryCard
          label="평균 성공률"
          value={`${totals.avgRate}%`}
          tone={totals.avgRate >= 90 ? 'good' : totals.avgRate >= 70 ? 'warn' : 'bad'}
        />
      </div>

      <div className="bg-white rounded-none shadow-sm border border-slate-200 overflow-hidden">
        <div className="py-4 px-6 bg-slate-50/50 border-b border-slate-200 font-bold text-sm text-slate-700">
          소스별 수집 성과
        </div>
        {stats.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">수집 로그가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/50 text-slate-600 font-semibold text-xs border-b border-slate-200">
                  <Th onClick={() => toggleSort('lastRun')} active={sortKey === 'lastRun'} dir={sortDir}>소스</Th>
                  <Th onClick={() => toggleSort('runs')} active={sortKey === 'runs'} dir={sortDir}>실행</Th>
                  <Th onClick={() => toggleSort('successRate')} active={sortKey === 'successRate'} dir={sortDir}>성공률</Th>
                  <Th onClick={() => toggleSort('avgDuration')} active={sortKey === 'avgDuration'} dir={sortDir}>평균(ms)</Th>
                  <Th onClick={() => toggleSort('newArticles')} active={sortKey === 'newArticles'} dir={sortDir}>신규</Th>
                  <th className="py-3 px-4">최근 상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.map((s) => (
                  <tr key={s.name} className="hover:bg-slate-50 text-xs">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-700">{s.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {s.category || '기타'}
                        {s.lastRun && ` · ${new Date(s.lastRun).toLocaleString('ko-KR')}`}
                      </div>
                    </td>
                    <td className="py-3 px-4 tabular-nums text-slate-600">{s.runs}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-slate-100 rounded-none overflow-hidden">
                          <div
                            className={`h-full rounded-none ${s.successRate >= 90 ? 'bg-emerald-500' : s.successRate >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${s.successRate}%` }}
                          />
                        </div>
                        <span className="tabular-nums text-slate-600">{s.successRate}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 tabular-nums text-slate-600">{s.avgDuration || '-'}</td>
                    <td className="py-3 px-4 tabular-nums text-slate-600">{s.newArticles.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <StatusPill status={s.lastStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
}) {
  const toneClass = {
    neutral: 'text-slate-900',
    good: 'text-emerald-600',
    warn: 'text-amber-600',
    bad: 'text-rose-600',
  }[tone];
  return (
    <div className="bg-white p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
      <span className="text-xs font-bold text-slate-400 uppercase">{label}</span>
      <span className={`text-2xl font-black mt-2 tabular-nums ${toneClass}`}>{value}</span>
    </div>
  );
}

function Th({
  children,
  onClick,
  active,
  dir,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  dir: 'asc' | 'desc';
}) {
  return (
    <th className="py-3 px-4">
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-1 font-semibold transition-colors ${active ? 'text-indigo-700' : 'text-slate-600 hover:text-slate-900'}`}
      >
        {children}
        {active && <span aria-hidden="true">{dir === 'asc' ? '▲' : '▼'}</span>}
      </button>
    </th>
  );
}

function StatusPill({ status }: { status: string | null }) {
  if (!status) return <span className="text-slate-300">-</span>;
  const map: Record<string, string> = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    partial: 'bg-amber-50 text-amber-700 border-amber-200',
    error: 'bg-rose-50 text-rose-700 border-rose-200',
  };
  const label: Record<string, string> = { success: '성공', partial: '부분', error: '실패' };
  return (
    <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold border ${map[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {label[status] || status}
    </span>
  );
}
