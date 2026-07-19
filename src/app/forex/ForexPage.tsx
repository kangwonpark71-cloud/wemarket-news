'use client';

import { useEffect, useState, useMemo } from 'react';
import { FinancialDashboard } from '@/components/financial/FinancialDashboard';
import { FinancialChart } from '@/components/financial/FinancialChart';

interface ForexData {
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  change: number;
  changeRate: number;
  source: string;
  timestamp: string;
}

const FLAGS: Record<string, string> = {
  USD: '🇺🇸',
  JPY: '🇯🇵',
  EUR: '🇪🇺',
  CNY: '🇨🇳',
  GBP: '🇬🇧',
  AUD: '🇦🇺',
  CAD: '🇨🇦',
  CHF: '🇨🇭',
  HKD: '🇭🇰',
  SGD: '🇸🇬',
  NZD: '🇳🇿',
};

const NAMES: Record<string, string> = {
  USD: '미국 달러',
  JPY: '일본 엔',
  EUR: '유로화',
  CNY: '중국 위안화',
  GBP: '영국 파운드',
  AUD: '호주 달러',
  CAD: '캐나다 달러',
  CHF: '스위스 프랑',
  HKD: '홍콩 달러',
  SGD: '싱가포르 달러',
  NZD: '뉴질랜드 달러',
};

export function ForexPage() {
  const [rates, setRates] = useState<ForexData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedForex, setSelectedForex] = useState<ForexData | null>(null);
  const [sortBy, setSortBy] = useState<'rate' | 'baseCurrency'>('rate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchRates = async () => {
    try {
      const res = await fetch('/api/financial/forex?action=rates');
      const json = await res.json();
      if (json.success) {
        setRates(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch forex rates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredAndSortedRates = useMemo(() => {
    let result = [...rates];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.baseCurrency.toLowerCase().includes(q) ||
          (NAMES[r.baseCurrency] && NAMES[r.baseCurrency].toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'baseCurrency') {
        return sortOrder === 'desc'
          ? b.baseCurrency.localeCompare(a.baseCurrency)
          : a.baseCurrency.localeCompare(b.baseCurrency);
      }
      const aVal = a.rate ?? 0;
      const bVal = b.rate ?? 0;
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return result;
  }, [rates, search, sortBy, sortOrder]);

  const handleSort = (field: 'rate' | 'baseCurrency') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  if (loading && rates.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 animate-pulse">
          <div className="h-8 bg-muted rounded-sm w-1/4 mb-2" />
          <div className="h-4 bg-muted rounded-sm w-1/3" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-sm border border-border bg-card p-4 h-28" />
          ))}
        </div>
        <div className="border border-border bg-card p-6 h-96 animate-pulse rounded-sm" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">환율 시장</h1>
        <p className="text-sm text-muted-foreground mt-1">주요 국가별 원화(KRW) 대비 외국환 매매기준율 시황</p>
      </div>

      <FinancialDashboard />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-foreground">주요 외환 실시간 시세</h2>
        <input
          type="search"
          placeholder="통화명/통화코드 검색 (예: USD)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-64 rounded-sm border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="mt-4 border border-border bg-card overflow-x-auto rounded-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
            <tr>
              <th className="px-4 py-3 w-16 text-center">국기</th>
              <th
                className="px-4 py-3 cursor-pointer hover:bg-muted"
                onClick={() => handleSort('baseCurrency')}
              >
                통화명 <span className="ml-1">{sortBy === 'baseCurrency' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</span>
              </th>
              <th
                className="px-4 py-3 text-right cursor-pointer hover:bg-muted"
                onClick={() => handleSort('rate')}
              >
                매매기준율 (KRW) <span className="ml-1">{sortBy === 'rate' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</span>
              </th>
              <th className="px-4 py-3 text-right">대비</th>
              <th className="px-4 py-3 text-right">등락률</th>
              <th className="px-4 py-3 text-right hidden sm:table-cell">제공처</th>
              <th className="px-4 py-3 text-right hidden md:table-cell">갱신시간</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-medium text-foreground">
            {filteredAndSortedRates.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  일치하는 통화 정보가 없습니다.
                </td>
              </tr>
            ) : (
              filteredAndSortedRates.map((forex) => {
                const isPositive = forex.changeRate >= 0;
                const changeColor = isPositive ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400';

                return (
                  <tr
                    key={forex.baseCurrency}
                    onClick={() => setSelectedForex(forex)}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-center text-2xl">
                      {FLAGS[forex.baseCurrency] || '🏳️'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-sm text-foreground">
                        {forex.baseCurrency}/{forex.quoteCurrency}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {NAMES[forex.baseCurrency] || forex.baseCurrency}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-sm tabular-nums">
                      {forex.rate.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums ${changeColor}`}>
                      {forex.change !== 0 ? (isPositive ? '▲' : '▼') : ''} {Math.abs(forex.change).toFixed(2)}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold tabular-nums ${changeColor}`}>
                      {forex.changeRate !== 0 ? (isPositive ? '+' : '') : ''}{forex.changeRate.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">
                      {forex.source}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground tabular-nums hidden md:table-cell">
                      {new Date(forex.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedForex && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background border border-border max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] rounded-sm">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  {NAMES[selectedForex.baseCurrency] || selectedForex.baseCurrency} 상세 시황
                </h2>
                <p className="text-[10px] text-muted-foreground uppercase mt-0.5">
                  {selectedForex.baseCurrency} / {selectedForex.quoteCurrency} 환율 추이
                </p>
              </div>
              <button
                onClick={() => setSelectedForex(null)}
                className="text-muted-foreground hover:text-foreground text-2xl transition-colors cursor-pointer"
              >
                ×
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto">
              <FinancialChart symbol={`${selectedForex.baseCurrency}/${selectedForex.quoteCurrency}`} type="FOREX" height={280} />

              <div className="grid grid-cols-2 gap-3 border border-border p-3 bg-muted/20 text-xs rounded-sm">
                <div>
                  <p className="text-[10px] text-muted-foreground">현재 환율</p>
                  <p className="text-base font-black text-foreground mt-0.5 tabular-nums">
                    {selectedForex.rate.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    <span className="text-[10px] font-medium text-muted-foreground">KRW</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">전일 대비 변동</p>
                  <p className={`text-base font-black mt-0.5 tabular-nums ${selectedForex.changeRate >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                    {selectedForex.changeRate >= 0 ? '▲' : '▼'} {Math.abs(selectedForex.change).toFixed(2)} ({selectedForex.changeRate >= 0 ? '+' : ''}
                    {selectedForex.changeRate.toFixed(2)}%)
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">제공 소스</p>
                  <p className="text-sm font-bold text-foreground mt-1">{selectedForex.source} 고시 환율</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">최종 갱신 시간</p>
                  <p className="text-sm font-bold text-foreground mt-1 tabular-nums">
                    {new Date(selectedForex.timestamp).toLocaleString('ko-KR')}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedForex(null)}
                className="w-full py-2.5 px-4 rounded-none border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
