'use client';

import { useEffect, useState, useMemo } from 'react';
import { FinancialDashboard } from '@/components/financial/FinancialDashboard';
import { FinancialChart } from '@/components/financial/FinancialChart';

interface CryptoTickerData {
  symbol: string;
  name: string;
  nameKr?: string;
  tradePrice: number;
  signedChangePrice: number;
  signedChangeRate: number;
  askPrice: number;
  bidPrice: number;
  accTradePrice24h: number;
  accTradeVolume24h: number;
  highPrice24h: number;
  lowPrice24h: number;
  prevClosingPrice: number;
  timestamp: string;
}

interface CryptoMarketInfo {
  symbol: string;
  name: string;
  nameKr?: string;
  market: string;
}

export function CryptoPage() {
  const [tickers, setTickers] = useState<CryptoTickerData[]>([]);
  const [markets, setMarkets] = useState<CryptoMarketInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'GAINERS' | 'LOSERS' | 'VOLUME'>('ALL');
  const [selectedCrypto, setSelectedStock] = useState<CryptoTickerData | null>(null);
  const [sortBy, setSortBy] = useState<'tradePrice' | 'signedChangeRate' | 'accTradePrice24h'>('accTradePrice24h');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        const [mkRes, tkRes] = await Promise.all([
          fetch('/api/financial/crypto?action=markets'),
          fetch('/api/financial/crypto?action=tickers'),
        ]);

        const mkJson = await mkRes.json();
        const tkJson = await tkRes.json();

        if (mkJson.success) setMarkets(mkJson.data);
        if (tkJson.success) setTickers(tkJson.data);
      } catch (err) {
        console.error('Failed to load crypto data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/financial/crypto?action=tickers');
        const json = await res.json();
        if (json.success) {
          setTickers(json.data);
        }
      } catch (err) {
        console.error('Error polling tickers:', err);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const marketMap = useMemo(() => {
    return new Map(markets.map((m) => [m.symbol, m]));
  }, [markets]);

  const mappedTickers = useMemo(() => {
    return tickers.map((ticker) => ({
      ...ticker,
      nameKr: marketMap.get(ticker.symbol)?.nameKr || ticker.name,
    }));
  }, [tickers, marketMap]);

  const sortedAndFilteredTickers = useMemo(() => {
    let result = [...mappedTickers];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.symbol.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q) ||
          (t.nameKr && t.nameKr.toLowerCase().includes(q))
      );
    }

    if (filter === 'GAINERS') {
      result = result.filter((t) => t.signedChangeRate > 0);
    } else if (filter === 'LOSERS') {
      result = result.filter((t) => t.signedChangeRate < 0);
    }

    result.sort((a, b) => {
      const aVal = a[sortBy] ?? 0;
      const bVal = b[sortBy] ?? 0;
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    if (filter === 'VOLUME' && sortBy !== 'accTradePrice24h') {
      result.sort((a, b) => b.accTradePrice24h - a.accTradePrice24h);
    }

    return result;
  }, [mappedTickers, search, filter, sortBy, sortOrder]);

  const handleSort = (field: 'tradePrice' | 'signedChangeRate' | 'accTradePrice24h') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const formatPrice = (p: number) => {
    if (p >= 100) return p.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
    if (p >= 1) return p.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
    return p.toLocaleString('ko-KR', { maximumFractionDigits: 4 });
  };

  if (loading && tickers.length === 0) {
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
        <h1 className="text-2xl font-bold text-foreground">암호화폐 시장</h1>
        <p className="text-sm text-muted-foreground mt-1">업비트(Upbit) KRW 마켓 실시간 디지털 자산 시세 및 24H 거래량 순위</p>
      </div>

      <FinancialDashboard />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {(['ALL', 'VOLUME', 'GAINERS', 'LOSERS'] as const).map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                if (f === 'VOLUME') setSortBy('accTradePrice24h');
              }}
              className={`px-3 py-1.5 rounded-sm text-xs font-semibold border transition-all cursor-pointer ${
                filter === f
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'bg-background dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {f === 'ALL' ? '전체' : f === 'VOLUME' ? '거래량 순' : f === 'GAINERS' ? '상승 종목' : '하락 종목'}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
          <input
            type="search"
            placeholder="자산명/심볼 검색 (예: BTC)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 rounded-sm border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="mt-4 border border-border bg-card overflow-x-auto rounded-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
            <tr>
              <th className="px-4 py-3 w-16 text-center">#</th>
              <th className="px-4 py-3">자산명 / 심볼</th>
              <th
                className="px-4 py-3 text-right cursor-pointer hover:bg-muted"
                onClick={() => handleSort('tradePrice')}
              >
                현재가 (KRW) <span className="ml-1">{sortBy === 'tradePrice' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</span>
              </th>
              <th
                className="px-4 py-3 text-right cursor-pointer hover:bg-muted"
                onClick={() => handleSort('signedChangeRate')}
              >
                24H 등락률 <span className="ml-1">{sortBy === 'signedChangeRate' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</span>
              </th>
              <th className="px-4 py-3 text-right">24H 등락액</th>
              <th
                className="px-4 py-3 text-right cursor-pointer hover:bg-muted"
                onClick={() => handleSort('accTradePrice24h')}
              >
                24H 거래대금 <span className="ml-1">{sortBy === 'accTradePrice24h' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</span>
              </th>
              <th className="px-4 py-3 text-right hidden md:table-cell">24H 최고가</th>
              <th className="px-4 py-3 text-right hidden md:table-cell">24H 최저가</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-medium text-foreground">
            {sortedAndFilteredTickers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  일치하는 가상자산이 없습니다.
                </td>
              </tr>
            ) : (
              sortedAndFilteredTickers.map((crypto, index) => {
                const isPositive = crypto.signedChangeRate >= 0;
                const changeColor = isPositive ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400';

                return (
                  <tr
                    key={crypto.symbol}
                    onClick={() => setSelectedStock(crypto)}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-center text-muted-foreground">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-sm text-foreground">{crypto.nameKr || crypto.symbol}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">{crypto.symbol} / KRW</div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">
                      {formatPrice(crypto.tradePrice)}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold tabular-nums ${changeColor}`}>
                      {isPositive ? '▲' : '▼'} {Math.abs(crypto.signedChangeRate).toFixed(2)}%
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums ${changeColor}`}>
                      {isPositive ? '+' : '-'}{formatPrice(Math.abs(crypto.signedChangePrice))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {crypto.accTradePrice24h >= 100000000
                        ? `${(crypto.accTradePrice24h / 100000000).toFixed(1)}억 원`
                        : `${(crypto.accTradePrice24h / 1000000).toFixed(0)}백만 원`}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground tabular-nums hidden md:table-cell">
                      {formatPrice(crypto.highPrice24h)}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground tabular-nums hidden md:table-cell">
                      {formatPrice(crypto.lowPrice24h)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedCrypto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background border border-border max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] rounded-sm">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">{selectedCrypto.nameKr || selectedCrypto.symbol} 상세 정보</h2>
                <p className="text-[10px] text-muted-foreground uppercase mt-0.5">{selectedCrypto.symbol} / KRW 시장 가격 추이</p>
              </div>
              <button
                onClick={() => setSelectedStock(null)}
                className="text-muted-foreground hover:text-foreground text-2xl transition-colors cursor-pointer"
              >
                ×
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto">
              <FinancialChart symbol={selectedCrypto.symbol} type="CRYPTO" height={280} />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 border border-border p-3 bg-muted/20 text-xs rounded-sm">
                <div>
                  <p className="text-[10px] text-muted-foreground">현재 시세</p>
                  <p className="text-base font-black text-foreground mt-0.5 tabular-nums">
                    {formatPrice(selectedCrypto.tradePrice)} <span className="text-[10px] font-medium text-muted-foreground">KRW</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">24H 등락률</p>
                  <p className={`text-base font-black mt-0.5 tabular-nums ${selectedCrypto.signedChangeRate >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                    {selectedCrypto.signedChangeRate >= 0 ? '+' : ''}{selectedCrypto.signedChangeRate.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">24H 거래대금</p>
                  <p className="text-base font-black text-foreground mt-0.5 tabular-nums">
                    {selectedCrypto.accTradePrice24h >= 100000000
                      ? `${(selectedCrypto.accTradePrice24h / 100000000).toFixed(1)}억원`
                      : `${(selectedCrypto.accTradePrice24h / 1000000).toFixed(0)}백만원`}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">24H 최고가</p>
                  <p className="text-sm font-bold text-foreground mt-0.5 tabular-nums text-red-600">
                    ▲ {formatPrice(selectedCrypto.highPrice24h)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">24H 최저가</p>
                  <p className="text-sm font-bold text-foreground mt-0.5 tabular-nums text-blue-600">
                    ▼ {formatPrice(selectedCrypto.lowPrice24h)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">매도호가 / 매수호가</p>
                  <p className="text-[11px] font-bold text-foreground mt-1 tabular-nums">
                    {formatPrice(selectedCrypto.askPrice)} / {formatPrice(selectedCrypto.bidPrice)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedStock(null)}
                className="w-full py-2.5 px-4 rounded-none border border-slate-200 dark:border-slate-800 bg-background dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
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
