'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface DashboardData {
  kospi: { value: number; change: number; changeRate: number };
  kosdaq: { value: number; change: number; changeRate: number };
  btc: { price: number; change: number; changeRate: number } | null;
  eth: { price: number; change: number; changeRate: number } | null;
  usdKrw: { rate: number; change: number; changeRate: number } | null;
  nasdaq: { price: number; change: number; changeRate: number } | null;
  lastUpdated: string;
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 24;
  const points = data.map((v, i) =>
    `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`
  ).join(' ');

  return (
    <svg className="shrink-0" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function useSparklineHistory() {
  const [history, setHistory] = useState<Record<string, number[]>>({});

  const push = useCallback((key: string, value: number) => {
    setHistory((prev) => {
      const arr = prev[key] ? [...prev[key]] : [];
      arr.push(value);
      if (arr.length > 20) arr.shift();
      return { ...prev, [key]: arr };
    });
  }, []);

  return { history, push };
}

export function FinancialDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const retryCountRef = useRef(0);
  const { history, push } = useSparklineHistory();

  const fetchDataRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/financial/dashboard');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setError(null);
        retryCountRef.current = 0;
        setRetryCount(0);
        const now = new Date();
        setLastUpdate(now);

        const dash = json.data;
        push('kospi', dash.kospi.value);
        push('nasdaq', dash.nasdaq?.price || 0);
        push('btc', dash.btc?.price || 0);
      } else {
        setError(json.error);
      }
    } catch {
      setError('데이터를 불러오는데 실패했습니다.');
      if (retryCountRef.current < 3) {
        retryCountRef.current += 1;
        setRetryCount(retryCountRef.current);
        setTimeout(() => {
          void fetchDataRef.current();
        }, 5000 * retryCountRef.current);
      }
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    fetchDataRef.current = fetchData;
  }, [fetchData]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/financial/refresh', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        await fetchData();
      } else {
        alert(json.error || '갱신 실패');
      }
    } catch {
      alert('시장 데이터 갱신 중 오류가 발생했습니다.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const backendRefreshInterval = setInterval(async () => {
      try {
        await fetch('/api/financial/refresh', { method: 'POST' });
        await fetchData();
      } catch (err) {
        console.error(err);
      }
    }, 3 * 60 * 60 * 1000);

    return () => clearInterval(backendRefreshInterval);
  }, [fetchData]);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}초 전`;
    return date.toLocaleTimeString('ko-KR');
  };

  const formatKRW = (v: number) =>
    new Intl.NumberFormat('ko-KR').format(v);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse rounded-none border border-border bg-card p-4 h-28" />
        ))}
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-none border border-danger-light bg-danger-light/50 p-4 text-center">
        <p className="text-sm text-danger">{error}</p>
        {retryCount < 3 && (
          <p className="mt-1 text-xs text-muted-foreground">
            자동 재시도 중... ({retryCount + 1}/3)
          </p>
        )}
        <button
          onClick={() => { setLoading(true); setRetryCount(0); fetchData(); }}
          className="mt-2 rounded-none bg-primary px-3 py-1 text-xs text-white hover:bg-primary-hover"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!data) return null;

  const cards = [
    {
      title: 'KOSPI',
      value: formatKRW(data.kospi.value),
      change: data.kospi.change,
      changeRate: data.kospi.changeRate,
      color: '#2563eb',
      sparkKey: 'kospi',
    },
    {
      title: 'KOSDAQ',
      value: formatKRW(data.kosdaq.value),
      change: data.kosdaq.change,
      changeRate: data.kosdaq.changeRate,
      color: '#059669',
      sparkKey: 'kosdaq',
    },
    {
      title: 'Bitcoin',
      value: data.btc ? formatKRW(data.btc.price) + '원' : '-',
      change: data.btc?.change || 0,
      changeRate: data.btc?.changeRate || 0,
      color: '#f59e0b',
      sparkKey: 'btc',
    },
    {
      title: 'Ethereum',
      value: data.eth ? formatKRW(data.eth.price) + '원' : '-',
      change: data.eth?.change || 0,
      changeRate: data.eth?.changeRate || 0,
      color: '#8b5cf6',
      sparkKey: 'eth',
    },
    {
      title: 'USD/KRW',
      value: data.usdKrw ? formatKRW(data.usdKrw.rate) + '원' : '-',
      change: data.usdKrw?.change || 0,
      changeRate: data.usdKrw?.changeRate || 0,
      color: '#10b981',
      sparkKey: 'usd',
    },
    {
      title: 'NASDAQ',
      value: data.nasdaq ? formatKRW(data.nasdaq.price) : '-',
      change: data.nasdaq?.change || 0,
      changeRate: data.nasdaq?.changeRate || 0,
      color: '#6366f1',
      sparkKey: 'nasdaq',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-foreground">금융 대시보드</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-sm bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-medium">
            3시간 간격 자동갱신
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {lastUpdate ? `${formatTime(lastUpdate)} 업데이트` : ''}
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-none border border-slate-200 dark:border-slate-800 bg-background dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
          >
            {refreshing ? '🔄 갱신 중...' : '🔄 시장 갱신'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {cards.map((card, index) => {
          const isPositive = card.change >= 0;
          const changeColor = isPositive ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400';
          const bgClass = isPositive
            ? 'bg-red-50 dark:bg-red-950/20'
            : 'bg-blue-50 dark:bg-blue-950/20';
          const borderClass = isPositive
            ? 'border-red-100 dark:border-red-900/30'
            : 'border-blue-100 dark:border-blue-900/30';

          return (
            <div
              key={index}
              className={`rounded-none border ${borderClass} ${bgClass} p-3 transition-all hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{card.title}</span>
                <Sparkline data={history[card.sparkKey] || []} color={card.color} />
              </div>
              <p className="mt-1 text-lg font-bold text-foreground tabular-nums">{card.value}</p>
              <div className={`mt-1 flex items-center gap-1 text-xs font-medium ${changeColor}`}>
                <span>{isPositive ? '▲' : '▼'}</span>
                <span>
                  {Math.abs(card.change).toLocaleString()} ({isPositive ? '+' : ''}{card.changeRate.toFixed(2)}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FinancialDashboard;
