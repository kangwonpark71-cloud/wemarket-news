'use client';

import { useEffect, useState, useMemo } from 'react';
import { FinancialDashboard } from '@/components/financial/FinancialDashboard';
import { FinancialChart } from '@/components/financial/FinancialChart';

interface GlobalIndexData {
  symbol: string;
  name: string;
  nameKr?: string;
  price: number;
  change: number;
  changeRate: number;
  openPrice?: number;
  highPrice?: number;
  lowPrice?: number;
  previousClose?: number;
  volume?: number;
  timestamp: string;
}

export function GlobalPage() {
  const [indices, setIndices] = useState<GlobalIndexData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<GlobalIndexData | null>(null);
  const [sortBy, setSortBy] = useState<'price' | 'changeRate' | 'symbol'>('price');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const fetchIndices = async () => {
    try {
      const res = await fetch('/api/financial/global?action=indices');
      const json = await res.json();
      if (json.success) {
        setIndices(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch global indices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchIndices();
    const interval = setInterval(fetchIndices, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredAndSortedIndices = useMemo(() => {
    let result = [...indices];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (idx) =>
          idx.symbol.toLowerCase().includes(q) ||
          idx.name.toLowerCase().includes(q) ||
          (idx.nameKr && idx.nameKr.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'symbol') {
        return sortOrder === 'desc'
          ? b.symbol.localeCompare(a.symbol)
          : a.symbol.localeCompare(b.symbol);
      }
      const aVal = a[sortBy] ?? 0;
      const bVal = b[sortBy] ?? 0;
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return result;
  }, [indices, search, sortBy, sortOrder]);

  const handleSort = (field: 'price' | 'changeRate' | 'symbol') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  if (loading && indices.length === 0) {
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
        <h1 className="text-2xl font-bold text-foreground">글로벌 증시</h1>
        <p className="text-sm text-muted-foreground mt-1">미국 및 글로벌 주요 시장 지수 실시간 종합 시황</p>
      </div>

      <FinancialDashboard />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-foreground">글로벌 인덱스 시세</h2>
        <input
          type="search"
          placeholder="지수명/지수심볼 검색 (예: 나스닥)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-64 rounded-sm border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="mt-4 border border-border bg-card overflow-x-auto rounded-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
            <tr>
              <th className="px-4 py-3 w-16 text-center">#</th>
              <th
                className="px-4 py-3 cursor-pointer hover:bg-muted"
                onClick={() => handleSort('symbol')}
              >
                지수명 <span className="ml-1">{sortBy === 'symbol' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</span>
              </th>
              <th
                className="px-4 py-3 text-right cursor-pointer hover:bg-muted"
                onClick={() => handleSort('price')}
              >
                지수 가격 <span className="ml-1">{sortBy === 'price' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</span>
              </th>
              <th className="px-4 py-3 text-right">대비</th>
              <th
                className="px-4 py-3 text-right cursor-pointer hover:bg-muted"
                onClick={() => handleSort('changeRate')}
              >
                등락률 <span className="ml-1">{sortBy === 'changeRate' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</span>
              </th>
              <th className="px-4 py-3 text-right hidden sm:table-cell">시가</th>
              <th className="px-4 py-3 text-right hidden sm:table-cell">고가</th>
              <th className="px-4 py-3 text-right hidden sm:table-cell">저가</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-medium text-foreground">
            {filteredAndSortedIndices.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  일치하는 지수 정보가 없습니다.
                </td>
              </tr>
            ) : (
              filteredAndSortedIndices.map((idx, index) => {
                const isPositive = idx.changeRate >= 0;
                const changeColor = isPositive ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400';

                return (
                  <tr
                    key={idx.symbol}
                    onClick={() => setSelectedIndex(idx)}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-center text-muted-foreground">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-sm text-foreground">
                        {idx.nameKr || idx.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase">
                        {idx.symbol}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-sm tabular-nums">
                      {idx.price.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums ${changeColor}`}>
                      {idx.change !== 0 ? (isPositive ? '▲' : '▼') : ''} {Math.abs(idx.change).toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold tabular-nums ${changeColor}`}>
                      {idx.changeRate !== 0 ? (isPositive ? '+' : '') : ''}{idx.changeRate.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell tabular-nums">
                      {idx.openPrice ? idx.openPrice.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell tabular-nums">
                      {idx.highPrice ? idx.highPrice.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell tabular-nums">
                      {idx.lowPrice ? idx.lowPrice.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedIndex && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background border border-border max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] rounded-sm">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  {selectedIndex.nameKr || selectedIndex.name} 상세 정보
                </h2>
                <p className="text-[10px] text-muted-foreground uppercase mt-0.5">
                  {selectedIndex.symbol} 글로벌 마켓 인덱스 가격 차트
                </p>
              </div>
              <button
                onClick={() => setSelectedIndex(null)}
                className="text-muted-foreground hover:text-foreground text-2xl transition-colors cursor-pointer"
              >
                ×
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto">
              <FinancialChart symbol={selectedIndex.symbol} type="INDEX" height={280} />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 border border-border p-3 bg-muted/20 text-xs rounded-sm">
                <div>
                  <p className="text-[10px] text-muted-foreground">현재 지수</p>
                  <p className="text-base font-black text-foreground mt-0.5 tabular-nums">
                    {selectedIndex.price.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">변동 및 등락률</p>
                  <p className={`text-base font-black mt-0.5 tabular-nums ${selectedIndex.changeRate >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                    {selectedIndex.changeRate >= 0 ? '▲' : '▼'} {Math.abs(selectedIndex.change).toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({selectedIndex.changeRate >= 0 ? '+' : ''}
                    {selectedIndex.changeRate.toFixed(2)}%)
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">시가</p>
                  <p className="text-sm font-bold text-foreground mt-1 tabular-nums">
                    {selectedIndex.openPrice ? selectedIndex.openPrice.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">당일 최고가</p>
                  <p className="text-sm font-bold mt-1 tabular-nums text-red-600">
                    {selectedIndex.highPrice ? `▲ ${selectedIndex.highPrice.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">당일 최저가</p>
                  <p className="text-sm font-bold mt-1 tabular-nums text-blue-600">
                    {selectedIndex.lowPrice ? `▼ ${selectedIndex.lowPrice.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">이전 종가</p>
                  <p className="text-sm font-bold text-foreground mt-1 tabular-nums">
                    {selectedIndex.previousClose ? selectedIndex.previousClose.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedIndex(null)}
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
