'use client';

import { useState, useEffect } from 'react';

interface HealthData {
  database: { connected: boolean };
  totals: {
    articles: number;
    sources: { total: number; active: number; inactive: number };
    users: number;
    fetchLogs: number;
    financialLogs: number;
  };
  schedulers: {
    rss: { status: string; lastRun: string | null; lastStatus: string | null; lastCount: number; lastNewCount: number };
    aiit: { status: string; lastRun: string | null; lastStatus: string | null; lastCount: number; lastNewCount: number };
    financial: { lastRun: string | null; lastStatus: string | null; lastService: string | null };
  };
  errors: { last24h: number; recent: Array<{ id: string; sourceName: string; error: string | null; fetchedAt: string }> };
  distribution: {
    byCategory: Array<{ category: string; count: number }>;
    bySourceType: Array<{ sourceType: string; count: number }>;
  };
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    healthy: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
    pending: 'bg-slate-100 text-slate-500 border-slate-200',
    error: 'bg-rose-100 text-rose-700 border-rose-200',
  };
  const labels: Record<string, string> = {
    healthy: '정상',
    warning: '지연',
    pending: '대기',
    error: '오류',
  };
  return (
    <span className={`px-2 py-0.5 rounded-sm text-xs font-bold border ${colors[status] || colors.pending}`}>
      {labels[status] || status}
    </span>
  );
}

export default function AdminHealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/health')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setData(json.data);
        else setError(json.error || 'Failed to load health data');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-600">
        <div className="text-lg font-semibold animate-pulse">🏥 시스템 상태 확인 중...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-rose-600 font-semibold">❌ {error || '데이터를 불러올 수 없습니다.'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      <div className="bg-white rounded-none shadow-sm border border-slate-200 p-6">
        <h2 className="text-base font-bold text-slate-900 mb-4">🗄️ 데이터베이스</h2>
        <div className="flex items-center gap-3">
          <span className={`inline-block h-3 w-3 rounded-full ${data.database.connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className="text-sm font-semibold text-slate-700">
            {data.database.connected ? 'PostgreSQL 연결 정상' : '연결 끊김'}
          </span>
        </div>
      </div>

      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase">전체 기사</span>
          <span className="text-2xl font-black text-slate-900 mt-2">{data.totals.articles.toLocaleString()}</span>
        </div>
        <div className="bg-white p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase">수집 채널</span>
          <span className="text-2xl font-black text-slate-900 mt-2">
            {data.totals.sources.active}
            <span className="text-sm text-slate-400 font-medium"> / {data.totals.sources.total}</span>
          </span>
        </div>
        <div className="bg-white p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase">사용자</span>
          <span className="text-2xl font-black text-slate-900 mt-2">{data.totals.users}</span>
        </div>
        <div className="bg-white p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase">수집 로그</span>
          <span className="text-2xl font-black text-slate-900 mt-2">{data.totals.fetchLogs.toLocaleString()}</span>
        </div>
      </div>

      
      <div className="bg-white rounded-none shadow-sm border border-slate-200 overflow-hidden">
        <div className="py-4 px-6 bg-slate-50/50 border-b border-slate-200 font-bold text-sm text-slate-700">
          ⏱️ 스케줄러 상태
        </div>
        <div className="divide-y divide-slate-100">
          {[
            { label: 'RSS 수집 (경제 뉴스)', key: 'rss' as const, icon: '📰' },
            { label: 'AI/IT 수집', key: 'aiit' as const, icon: '🤖' },
            { label: '금융 데이터', key: 'financial' as const, icon: '💹' },
          ].map(({ label, key, icon }) => {
            const s = data.schedulers[key];
            return (
              <div key={key} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg" aria-hidden="true">{icon}</span>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{label}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {s.lastRun ? new Date(s.lastRun).toLocaleString('ko-KR') : '아직 실행되지 않음'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {s.lastStatus && (
                    <span className={`px-2 py-0.5 rounded-sm text-xs font-bold border ${
                      s.lastStatus === 'success' || s.lastStatus === 'partial'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {s.lastStatus}
                    </span>
                  )}
                  {'status' in s && s.status && <StatusBadge status={s.status} />}
                  {'lastCount' in s && s.lastCount > 0 && (
                    <span className="text-xs text-slate-500">+{s.lastNewCount} / {s.lastCount}건</span>
                  )}
                  {'lastService' in s && s.lastService && (
                    <span className="text-xs text-slate-500">{s.lastService}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-none shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4">📂 카테고리별 기사 분포</h3>
          {data.distribution.byCategory.length === 0 ? (
            <p className="text-xs text-slate-400">데이터 없음</p>
          ) : (
            <div className="space-y-2">
              {data.distribution.byCategory.map((cat) => {
                const total = data.totals.articles || 1;
                const pct = Math.round((cat.count / total) * 100);
                return (
                  <div key={cat.category}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700">{cat.category || '(미분류)'}</span>
                      <span className="text-slate-500">{cat.count.toLocaleString()} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-none overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-none transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="bg-white rounded-none shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4">📡 소스 유형별 기사 분포</h3>
          {data.distribution.bySourceType.length === 0 ? (
            <p className="text-xs text-slate-400">데이터 없음</p>
          ) : (
            <div className="space-y-2">
              {data.distribution.bySourceType.map((st) => {
                const total = data.totals.articles || 1;
                const pct = Math.round((st.count / total) * 100);
                return (
                  <div key={st.sourceType}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700">{st.sourceType}</span>
                      <span className="text-slate-500">{st.count.toLocaleString()} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-none overflow-hidden">
                      <div className="h-full bg-teal-500 rounded-none transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      
      <div className="bg-white rounded-none shadow-sm border border-slate-200 overflow-hidden">
        <div className="py-4 px-6 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between">
          <span className="font-bold text-sm text-slate-700">⚠️ 최근 24시간 오류 ({data.errors.last24h}건)</span>
        </div>
        {data.errors.recent.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">24시간 내 오류가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/50 text-slate-600 font-semibold text-xs border-b border-slate-200">
                  <th className="py-3 px-4">소스</th>
                  <th className="py-3 px-4">상태</th>
                  <th className="py-3 px-4">오류 내용</th>
                  <th className="py-3 px-4">발생 시간</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.errors.recent.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 text-xs">
                    <td className="py-3 px-4 font-semibold text-slate-700">{e.sourceName}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-sm font-bold text-[10px] bg-rose-50 text-rose-700 border border-rose-200">
                        ERROR
                      </span>
                    </td>
                    <td className="py-3 px-4 text-rose-600 max-w-md truncate" title={e.error || ''}>{e.error || '-'}</td>
                    <td className="py-3 px-4 text-slate-500 tabular-nums">{new Date(e.fetchedAt).toLocaleString('ko-KR')}</td>
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
